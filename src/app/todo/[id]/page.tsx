'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodo, updateTodo, deleteTodo, createTodo, restoreTodo, addCommitToTodo, getTodoCommits } from '../../actions/todo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Todo, TodoCommit } from '@/types/todo'
import { useTodoDetailStore } from '@/stores/todoDetailStore'
import CommitList from '../components/CommitList'
import TodoInput from '../components/TodoInput'

export default function TodoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const todoId = parseInt(params.id as string)

  const {
    todo,
    progressUpdates,
    loading,
    sending,
    setTodo,
    setProgressUpdates,
    addProgressUpdate,
    setLoading,
    setSending,
    reset
  } = useTodoDetailStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
  }, [todoId, router, setTodo, setProgressUpdates, setLoading])

  useEffect(() => {
    reset() // 重置状态
    loadTodo()
  }, [todoId, loadTodo, reset])

  useEffect(() => {
    scrollToBottom()
  }, [progressUpdates])

  const handleSendProgressUpdate = async (messageText: string) => {
    if (!messageText.trim() || sending || !todo) return

    setSending(true)
    try {
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
      addProgressUpdate(newUpdate)
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
      addProgressUpdate(newUpdate)
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
        <CommitList progressUpdates={progressUpdates} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <TodoInput
          onSubmit={handleSendProgressUpdate}
          placeholder={todo?.title === '新任务' ? "输入任务标题..." : "分享你的进度..."}
          disabled={sending}
        />
      </div>
    </div>
  )
}
