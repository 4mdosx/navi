'use client'

import { useState, useEffect } from 'react'
import { getTodos } from '../actions/todo'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Todo } from '@/types/todo'

export default function TodoListPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadTodos()
  }, [])

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">我的任务</h1>
        <p className="text-sm text-gray-500">管理你的待办事项</p>
      </div>

      {/* Content */}
      <div className="p-4">
        {todos.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">平静的一天</p>
              <p className="text-sm text-gray-400">点击下方 💡 按钮开始你的任务</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {todos.map((todo) => (
              <Link key={todo.id} href={`/todo/${todo.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-gray-900 truncate ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p className={`text-sm text-gray-600 mt-1 line-clamp-2 ${todo.completed ? 'line-through' : ''}`}>
                          {todo.description}
                        </p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ml-2 flex-shrink-0 ${
                      todo.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {todo.completed && '✓'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatTime(todo.createdAt)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      todo.completed
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {todo.completed ? '已完成' : '进行中'}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={() => router.push(`/todo/0`)}
          className="group relative w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 opacity-30 group-hover:opacity-50 blur-sm transition-opacity duration-300"></div>

          {/* Pulse animation ring */}
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-10 group-hover:opacity-30"></div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

          {/* Ripple effect on click */}
          <div className="absolute inset-0 rounded-full bg-white/30 scale-0 group-active:scale-100 transition-transform duration-150"></div>

          {/* Icon with rotation animation */}
          <div className="relative z-10 group-hover:rotate-90 transition-transform duration-300">
              {/* Plus icon */}
              <svg className="w-7 h-7 group-hover:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  className="group-hover:scale-110 transition-transform duration-200"
                />
              </svg>

              {/* Sparkle icon on hover */}
              <svg className="w-7 h-7 hidden group-hover:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                  className="animate-pulse"
                />
              </svg>
          </div>

          {/* Tooltip with animation */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap group-hover:translate-y-0 translate-y-1">
            ✨ 创建新任务
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>
    </div>
  )
}
