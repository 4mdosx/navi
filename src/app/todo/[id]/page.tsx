'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTodo, createTodo, getTodoCommits } from '../../actions/todo'
import Link from 'next/link'
import { Todo, TodoCommit } from '@/types/todo'
import { useTodoDetailStore } from '@/stores/todoDetailStore'
import CommitList from '../components/CommitList'
import TodoInput from '../components/TodoInput'
import { v4 as uuidv4 } from 'uuid'

export default function TodoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const todoId = parseInt(params.id as string)

  const {
    todo,
    commits,
    loading,
    sending,
    setTodo,
    setCommits,
    addCommit,
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
          deletedAt: null,
          commit: []
        } as Todo)
        setCommits([])
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
      setCommits(commits)
    } catch (error) {
      console.error('Failed to load todo:', error)
      router.push('/todo')
    } finally {
      setLoading(false)
    }
  }, [todoId, router, setTodo, setCommits, setLoading])

  useEffect(() => {
    reset() // 重置状态
    loadTodo()
  }, [todoId, loadTodo, reset])

  useEffect(() => {
    scrollToBottom()
  }, [commits])

  const handleSendProgressUpdate = async (parsedCommit: Omit<TodoCommit, 'id' | 'timestamp'>) => {
    if (!parsedCommit.message.trim() || sending || !todo) return

    setSending(true)
    try {
      // 如果是第一条用户消息，更新任务标题
      if (todo.id === 0) {
        const newTodo = await createTodo(parsedCommit.message)
        router.push(`/todo/${newTodo.id}`)
        return
      }

      const updatedCommit: TodoCommit = {
        ...parsedCommit,
        id: uuidv4(),
        timestamp: new Date().toISOString()
      }

      // 更新本地状态，乐观更新
      addCommit(updatedCommit)

      // 保存到数据库, 使用更新后的commit覆盖本地状态
      // const result = await addCommitToTodo(todo.id, updatedCommit)
      // console.log('result', result)
    } catch (error) {
      console.error('Failed to send progress update:', error)
      // TODO: 回滚本地状态
      // setProgressUpdates((prev: TodoCommit[]) => prev.filter((commit: TodoCommit) => commit.id !== updatedCommit.id))
    } finally {
      setSending(false)
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <CommitList
            commits={commits}
          />
        </div>
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
