'use client'

import { forwardRef } from 'react'
import { Todo } from '@/types/todo'


interface TodoListProps {
  todos: Todo[]
  onToggleTodo: (id: number) => void
  onDeleteTodo: (id: number) => void
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

export const TodoList = forwardRef<HTMLDivElement, TodoListProps>(
  ({ todos, onToggleTodo, onDeleteTodo }, ref) => {
    return (
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
                        onClick={() => onToggleTodo(todo.id)}
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
                        onClick={() => onDeleteTodo(todo.id)}
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
        <div ref={ref} />
      </div>
    )
  }
)

TodoList.displayName = 'TodoList'
