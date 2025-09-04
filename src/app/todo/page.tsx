'use client'

import { useState, useEffect, useRef } from 'react'
import { createTodo, getTodos, updateTodo, deleteTodo, toggleTodo } from '../actions/todo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Todo {
  id: number
  title: string
  description: string
  completed: number
  createdAt: string
  updatedAt: string
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTodos()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [todos])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadTodos = async () => {
    try {
      const todosData = await getTodos()
      setTodos(todosData as Todo[])
    } catch (error) {
      console.error('Failed to load todos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const todo = await createTodo(message.trim())
      setTodos([...todos, todo as Todo])
      setMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to create todo:', error)
    } finally {
      setSending(false)
    }
  }

  const handleToggleTodo = async (id: number) => {
    try {
      const updatedTodo = await toggleTodo(id)
      setTodos(todos.map(todo =>
        todo.id === id ? updatedTodo as Todo : todo
      ))
    } catch (error) {
      console.error('Failed to toggle todo:', error)
    }
  }

  const handleDeleteTodo = async (id: number) => {
    try {
      await deleteTodo(id)
      setTodos(todos.filter(todo => todo.id !== id))
    } catch (error) {
      console.error('Failed to delete todo:', error)
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

  if (loading) {
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
        <h1 className="text-lg font-semibold text-gray-900">Todo 聊天</h1>
        <p className="text-sm text-gray-500">输入你的待办事项，点击发送创建</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">还没有待办事项</p>
              <p className="text-sm text-gray-400">在下方输入框中输入内容开始创建</p>
            </div>
          </div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-3 group">
              {/* Avatar */}
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                T
              </div>

              {/* Message Bubble */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-gray-900 ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                        {todo.title}
                      </p>
                      {todo.description && (
                        <p className={`text-sm text-gray-600 mt-1 ${todo.completed ? 'line-through' : ''}`}>
                          {todo.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleTodo(todo.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                          todo.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                        title={todo.completed ? '标记为未完成' : '标记为完成'}
                      >
                        {todo.completed && '✓'}
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="w-6 h-6 rounded-full border border-red-200 hover:bg-red-50 flex items-center justify-center text-red-500 text-xs"
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="text-xs text-gray-400 mt-1 ml-2">
                  {formatTime(todo.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入待办事项..."
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
