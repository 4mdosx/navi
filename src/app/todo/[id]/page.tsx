'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodo, updateTodo, deleteTodo, createTodo, restoreTodo, addCommitToTodo, getTodoCommits } from '../../actions/todo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Todo, TodoCommit } from '@/types/todo'
import { BookPlus, BookText, BookMarked } from 'lucide-react'

export default function TodoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const todoId = parseInt(params.id as string)

  const [todo, setTodo] = useState<Todo | null>(null)
  const [progressUpdates, setProgressUpdates] = useState<TodoCommit[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadTodo = useCallback(async () => {
    try {
      if (todoId === 0) {
        setTodo({
          id: 0,
          title: '新任务',
          description: '',
          completed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        } as Todo)
        setProgressUpdates([])
        return
      }
      const todoData = await getTodo(todoId)
      if (!todoData) {
        router.push('/todo')
        return
      }
      setTodo(todoData as Todo)

      // 加载commit历史
      const commits = await getTodoCommits(todoId)
      setProgressUpdates(commits)
    } catch (error) {
      console.error('Failed to load todo:', error)
      router.push('/todo')
    } finally {
      setLoading(false)
    }
  }, [todoId, router])

  useEffect(() => {
    loadTodo()
  }, [todoId, loadTodo])

  useEffect(() => {
    scrollToBottom()
  }, [progressUpdates])

  const handleSendProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || !todo) return

    setSending(true)
    try {
      const messageText = message.trim()

      // 如果是第一条用户消息，更新任务标题
      if (todo.id === 0) {
        const newTodo = await createTodo(messageText)
        router.push(`/todo/${newTodo.id}`)
        return
      }

      const newUpdate: TodoCommit = {
        id: Date.now().toString(),
        message: messageText,
        timestamp: new Date().toISOString(),
        action: 'update',
        type: 'user'
      }

      // 保存到数据库
      await addCommitToTodo(todo.id, newUpdate)

      // 更新本地状态
      setProgressUpdates(prev => [...prev, newUpdate])
      setMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send progress update:', error)
    } finally {
      setSending(false)
    }
  }

  const handleToggleComplete = async () => {
    if (!todo) return

    try {
      const updatedTodo = await updateTodo(todo.id, { completed: !todo.completed })
      setTodo(updatedTodo as Todo)

      const newUpdate: TodoCommit = {
        id: Date.now().toString(),
        message: updatedTodo.completed ? '任务已完成' : '任务重新开始',
        timestamp: new Date().toISOString(),
        action: 'update',
        type: 'system'
      }

      // 保存到数据库
      await addCommitToTodo(todo.id, newUpdate)

      // 更新本地状态
      setProgressUpdates(prev => [...prev, newUpdate])
    } catch (error) {
      console.error('Failed to toggle todo:', error)
    }
  }

  const handleDeleteTodo = async () => {
    if (!todo) return

    try {
      await deleteTodo(todo.id)
      router.push('/todo')
    } catch (error) {
      console.error('Failed to delete todo:', error)
    }
  }

  const handleRestoreTodo = async () => {
    if (!todo) return

    try {
      await restoreTodo(todo.id)
      router.push('/todo')
    } catch (error) {
      console.error('Failed to restore todo:', error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  if (loading || !todo) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/todo"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className={`text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {todo.title}
              </h1>
              {todo.description && (
                <p className={`text-sm text-gray-500 ${todo.completed ? 'line-through' : ''}`}>
                  {todo.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {todo.deletedAt ? (
              <Button
                onClick={handleRestoreTodo}
                variant="default"
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                恢复
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleToggleComplete}
                  variant={todo.completed ? "outline" : "default"}
                  size="sm"
                  className={todo.completed ? "text-green-600 border-green-600" : "bg-green-500 hover:bg-green-600"}
                >
                  {todo.completed ? '重新开始' : '标记完成'}
                </Button>
                <Button
                  onClick={handleDeleteTodo}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  删除
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Commit Timeline Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {progressUpdates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">还没有提交记录</p>
              <p className="text-sm text-gray-400">在下方输入框中记录你的进度</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {progressUpdates.map((update) => (
                <div key={update.id} className="relative flex items-start gap-4 mb-6 last:mb-0">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-lg ${
                    update.action === 'create'
                      ? 'bg-green-500 ring-4 ring-green-100'
                      : update.action === 'update'
                      ? 'bg-blue-500 ring-4 ring-blue-100'
                      : 'bg-red-500 ring-4 ring-red-100'
                  }`}>
                    {update.action === 'create' ? (
                      <BookPlus />
                    ) : update.action === 'update' ? (
                      <BookText />
                    ) : (
                      <BookMarked />
                    )}
                  </div>

                  {/* Commit content */}
                  <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(update.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-900 leading-relaxed">{update.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendProgressUpdate} className="flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={todo?.title === '新任务' ? "输入任务标题..." : "分享你的进度..."}
            className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sending}
            className="rounded-full px-6 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
