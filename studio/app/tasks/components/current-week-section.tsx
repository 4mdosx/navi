'use client'

import { useMemo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { mutate as globalMutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'
import {
  getCurrentWeekNumber,
  getWeekStartDate,
  getTaskStartWeek,
} from '@/backstage/tasks/utils'

interface CurrentWeekSectionProps {
  tasks: Task[]
  activeTaskId?: string | null // 激活的任务 ID
}

interface TaskWeekCardProps {
  task: Task
  currentWeekNumber: number
  weekStartDate: Date
  onTodoUpdate?: (taskId: string, todoIndex: number, completed: boolean) => Promise<void>
}

function TaskWeekCard({ task, currentWeekNumber, onTodoUpdate }: TaskWeekCardProps) {
  // 只显示当前周的 todo 项（todo 数组索引 = 周数 - 1）
  const currentWeekTodoIndex = currentWeekNumber - 1
  const currentWeekTodo = task.todo && task.todo[currentWeekTodoIndex]
  const [isUpdating, setIsUpdating] = useState(false)

  const handleCheckboxChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onTodoUpdate) return

    const newCompleted = e.target.checked
    setIsUpdating(true)

    try {
      await onTodoUpdate(task.id, currentWeekTodoIndex, newCompleted)
    } catch (error) {
      console.error('Error updating todo:', error)
      // 恢复 checkbox 状态
      e.target.checked = !newCompleted
      alert(error instanceof Error ? error.message : '更新失败，请重试')
    } finally {
      setIsUpdating(false)
    }
  }, [task.id, currentWeekTodoIndex, onTodoUpdate])

  if (!currentWeekTodo) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  进度: {task.progress}%
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground py-4 text-center">
            本周还没有待办事项
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                <CardTitle className="text-base">{task.title}</CardTitle>
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                进度: {task.progress}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 当前周的 Todo 项 */}
        <div
          className={cn(
            'text-sm p-3 rounded-md border',
            currentWeekTodo.completed
              ? 'bg-muted/30 border-muted-foreground/20 opacity-60'
              : 'bg-muted/50 border-border'
          )}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={currentWeekTodo.completed || false}
              onChange={handleCheckboxChange}
              disabled={isUpdating}
              className="mt-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              {currentWeekTodo.title && (
                <div className="font-medium mb-1">{currentWeekTodo.title}</div>
              )}
              {currentWeekTodo.content && (
                <div className="text-muted-foreground markdown-content">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>,
                      li: ({ children }) => <li className="ml-1 leading-relaxed">{children}</li>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4 first:mt-0 text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-foreground">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-foreground">{children}</h4>,
                      h5: ({ children }) => <h5 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-foreground">{children}</h5>,
                      h6: ({ children }) => <h6 className="text-xs font-medium mb-1 mt-2 first:mt-0 text-foreground">{children}</h6>,
                      code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-muted p-2 rounded overflow-x-auto mb-2 text-xs">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic mb-2">{children}</blockquote>,
                      a: ({ children, href }) => <a href={href} className="text-primary underline hover:text-primary/80">{children}</a>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                    }}
                  >
                    {currentWeekTodo.content}
                  </ReactMarkdown>
                </div>
              )}
              {currentWeekTodo.comment && (
                <div className="text-xs text-muted-foreground/70 mt-1 italic markdown-content">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="ml-1">{children}</li>,
                      code: ({ children }) => <code className="bg-muted/50 px-0.5 py-0 rounded text-[10px] font-mono">{children}</code>,
                      a: ({ children, href }) => <a href={href} className="text-primary/70 underline hover:text-primary/50">{children}</a>,
                    }}
                  >
                    {currentWeekTodo.comment}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CurrentWeekSection({
  tasks,
  activeTaskId,
}: CurrentWeekSectionProps) {
  const activeTasks = useMemo(() => {
    if (activeTaskId) {
      const activeTask = tasks.find((task) => task.id === activeTaskId)
      return activeTask && activeTask.todo && activeTask.todo.length > 0
        ? [activeTask]
        : []
    }
    return []
  }, [tasks, activeTaskId])

  const handleTodoUpdate = useCallback(async (taskId: string, todoIndex: number, completed: boolean) => {
    const response = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, todoIndex, completed }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '更新失败')
    }

    // 使用 SWR 的 mutate 来重新验证任务列表
    await globalMutate('/api/tasks', undefined, { revalidate: true })
  }, [])

  if (activeTasks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {activeTasks.map((task) => {
          const taskStartWeekForTask = getTaskStartWeek(task)
          const taskCurrentWeekNumber = getCurrentWeekNumber(task)
          const taskWeekStartDate = getWeekStartDate(
            taskCurrentWeekNumber,
            taskStartWeekForTask
          )

          return (
            <TaskWeekCard
              key={task.id}
              task={task}
              currentWeekNumber={taskCurrentWeekNumber}
              weekStartDate={taskWeekStartDate}
              onTodoUpdate={handleTodoUpdate}
            />
          )
        })}
      </div>
    </div>
  )
}
