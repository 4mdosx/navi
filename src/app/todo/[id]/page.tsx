'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodo, updateTodo, deleteTodo, createTodo, restoreTodo } from '../../actions/todo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Todo, TodoCommit } from '@/types/todo'

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
        return
      }
      const todoData = await getTodo(todoId)
      if (!todoData) {
        router.push('/todo')
        return
      }
      setTodo(todoData as Todo)

      setProgressUpdates([])
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

      {/* Progress Updates Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {progressUpdates.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500">还没有进度更新</p>
              <p className="text-sm text-gray-400">在下方输入框中分享你的进度</p>
            </div>
          </div>
        ) : (
          progressUpdates.map((update) => (
            <div key={update.id} className={`flex items-start gap-3 ${update.type === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                update.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'
              }`}>
                {update.type === 'user' ? 'U' : 'S'}
              </div>

              {/* Message Bubble */}
              <div className={`flex-1 min-w-0 ${update.type === 'user' ? 'flex flex-col items-end' : ''}`}>
                <div className={`bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 max-w-xs ${
                  update.type === 'user'
                    ? 'rounded-tr-sm bg-blue-50 border-blue-200'
                    : 'rounded-tl-sm'
                }`}>
                  <p className="text-gray-900">{update.message}</p>
                </div>

                {/* Time */}
                <div className={`text-xs text-gray-400 mt-1 ${update.type === 'user' ? 'text-right' : 'ml-2'}`}>
                  {formatTime(update.timestamp)}
                </div>
              </div>
            </div>
          ))
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
