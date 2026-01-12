'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { mutate as globalMutate } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Task } from '@/types/tasks'
import {
  getCurrentWeekNumber,
  getWeekStartDate,
  getTaskStartWeek,
} from '@/backstage/tasks/utils'

interface CurrentWeekSectionProps {
  tasks: Task[]
  activeTaskId?: string | null // 激活的任务 ID
  selectedWeekNumber?: number | null // 选中的周数（相对于任务开始周，从1开始）。如果为 null，则显示当前周
}

interface TaskWeekCardProps {
  task: Task
  weekNumber: number // 要显示的周数（相对于任务开始周，从1开始）
  weekStartDate: Date
  onTodoUpdate?: (
    taskId: string,
    todoIndex: number,
    completed: boolean
  ) => Promise<void>
  onAddRecord?: (
    taskId: string,
    todoIndex: number,
    recordContent: string
  ) => Promise<void>
  onDeleteRecord?: (
    taskId: string,
    todoIndex: number,
    recordIndex: number
  ) => Promise<void>
}

function TaskWeekCard({
  task,
  weekNumber,
  onTodoUpdate,
  onAddRecord,
  onDeleteRecord,
}: TaskWeekCardProps) {
  // 显示指定周的 todo 项（todo 数组索引 = 周数 - 1）
  const weekTodoIndex = weekNumber - 1
  const weekTodo = task.todo && task.todo[weekTodoIndex]
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAddingRecord, setIsAddingRecord] = useState(false)
  const [isDeletingRecord, setIsDeletingRecord] = useState<number | null>(null)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const isConfirmingDeleteRef = useRef(false)
  const [recordInput, setRecordInput] = useState('')
  const [showAddRecord, setShowAddRecord] = useState(false)

  const handleCheckboxChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onTodoUpdate) return

      const newCompleted = e.target.checked
      setIsUpdating(true)

      try {
        await onTodoUpdate(task.id, weekTodoIndex, newCompleted)
      } catch (error) {
        console.error('Error updating todo:', error)
        // 恢复 checkbox 状态
        e.target.checked = !newCompleted
        alert(error instanceof Error ? error.message : '更新失败，请重试')
      } finally {
        setIsUpdating(false)
      }
    },
    [task.id, weekTodoIndex, onTodoUpdate]
  )

  const handleAddRecord = useCallback(async () => {
    if (!onAddRecord || !recordInput.trim()) return

    setIsAddingRecord(true)
    try {
      await onAddRecord(task.id, weekTodoIndex, recordInput.trim())
      setRecordInput('')
      setShowAddRecord(false)
    } catch (error) {
      console.error('Error adding record:', error)
      alert(error instanceof Error ? error.message : '添加记录失败，请重试')
    } finally {
      setIsAddingRecord(false)
    }
  }, [task.id, weekTodoIndex, recordInput, onAddRecord])

  const handleDeleteClick = useCallback((recordIndex: number) => {
    setPendingDeleteIndex(recordIndex)
  }, [])

  const handleConfirmDelete = useCallback(
    async (recordIndex: number) => {
      if (!onDeleteRecord) return

      // 标记正在确认删除，防止 tooltip 关闭
      isConfirmingDeleteRef.current = true
      setIsDeletingRecord(recordIndex)

      // 立即关闭 tooltip
      setPendingDeleteIndex(null)

      try {
        await onDeleteRecord(task.id, weekTodoIndex, recordIndex)
      } catch (error) {
        console.error('Error deleting record:', error)
        alert(error instanceof Error ? error.message : '删除记录失败，请重试')
      } finally {
        setIsDeletingRecord(null)
        isConfirmingDeleteRef.current = false
      }
    },
    [task.id, weekTodoIndex, onDeleteRecord]
  )

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteIndex(null)
  }, [])

  // 解析 comment：可能是数组或字符串
  const commentRecords = useMemo(() => {
    if (!weekTodo?.comment) return []

    if (Array.isArray(weekTodo.comment)) {
      return weekTodo.comment
    }

    // 如果是字符串，尝试解析为 JSON
    if (typeof weekTodo.comment === 'string') {
      try {
        const parsed = JSON.parse(weekTodo.comment)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch {
        // 如果不是 JSON，返回空数组（旧格式的字符串不显示）
        return []
      }
    }

    return []
  }, [weekTodo?.comment])

  if (!weekTodo) {
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
            第{weekNumber}周还没有待办事项
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
        {/* 指定周的 Todo 项 */}
        <div
          className={cn(
            'text-sm p-3 rounded-md border',
            weekTodo.completed
              ? 'bg-muted/30 border-muted-foreground/20 opacity-60'
              : 'bg-muted/50 border-border'
          )}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={weekTodo.completed || false}
              onChange={handleCheckboxChange}
              disabled={isUpdating}
              className="mt-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              {weekTodo.title && (
                <div className="font-medium mb-1">{weekTodo.title}</div>
              )}
              {weekTodo.content && (
                <div className="text-muted-foreground markdown-content">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1 ml-2">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="ml-1 leading-relaxed">{children}</li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-foreground">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-2 mt-4 first:mt-0 text-foreground">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-foreground">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-foreground">
                          {children}
                        </h4>
                      ),
                      h5: ({ children }) => (
                        <h5 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-foreground">
                          {children}
                        </h5>
                      ),
                      h6: ({ children }) => (
                        <h6 className="text-xs font-medium mb-1 mt-2 first:mt-0 text-foreground">
                          {children}
                        </h6>
                      ),
                      code: ({ children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-2 rounded overflow-x-auto mb-2 text-xs">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic mb-2">
                          {children}
                        </blockquote>
                      ),
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          className="text-primary underline hover:text-primary/80"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                    }}
                  >
                    {weekTodo.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
        {(commentRecords.length > 0 || showAddRecord) && (
          <div className="mt-2 space-y-2">
            {commentRecords.length > 0 && (
              <div className="space-y-1.5">
                {commentRecords.map((record: any, index: number) => (
                  <div
                    key={index}
                    className="text-xs text-muted-foreground/70 p-2 bg-muted/30 rounded border border-border/50 group/record"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap">
                          {record.content}
                        </div>
                        {record.updateAt && (
                          <div className="text-[10px] text-muted-foreground/50 mt-1">
                            {format(
                              new Date(record.updateAt),
                              'yyyy-MM-dd HH:mm'
                            )}
                          </div>
                        )}
                      </div>
                      <TooltipProvider>
                        <Tooltip
                          open={pendingDeleteIndex === index}
                          onOpenChange={(open) => {
                            // 如果正在确认删除，不关闭 tooltip
                            if (!open && !isConfirmingDeleteRef.current) {
                              setPendingDeleteIndex(null)
                            }
                          }}
                        >
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(index)}
                              disabled={isDeletingRecord === index}
                              className="h-6 w-6 p-0 opacity-0 group-hover/record:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="p-3 bg-white border border-border shadow-lg"
                            onPointerDownOutside={(e) => {
                              // 如果点击的是 tooltip 内部的按钮，不关闭 tooltip
                              const target = e.target as HTMLElement
                              // 检查点击的是否是按钮
                              if (target.closest('button')) {
                                e.preventDefault()
                              }
                            }}
                            onEscapeKeyDown={(e) => {
                              if (!isConfirmingDeleteRef.current) {
                                setPendingDeleteIndex(null)
                              } else {
                                e.preventDefault()
                              }
                            }}
                            onMouseDown={(e) => {
                              // 阻止点击 tooltip 内容时关闭
                              e.stopPropagation()
                            }}
                          >
                            <div className="flex flex-col gap-2" onMouseDown={(e) => e.stopPropagation()}>
                              <div className="text-xs font-medium text-foreground">
                                确定要删除这条记录吗？
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConfirmDelete(index)
                                  }}
                                  disabled={isDeletingRecord === index}
                                  className="h-7 px-3 text-xs"
                                >
                                  {isDeletingRecord === index
                                    ? '删除中...'
                                    : '确认删除'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onMouseDown={(e) => {
                                    e.stopPropagation()
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelDelete()
                                  }}
                                  disabled={isDeletingRecord === index}
                                  className="h-7 px-3 text-xs"
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加记录输入框 */}
            {showAddRecord && (
              <div className="space-y-2">
                <Textarea
                  value={recordInput}
                  onChange={(e) => setRecordInput(e.target.value)}
                  placeholder="输入记录内容..."
                  className="text-xs min-h-[60px]"
                  disabled={isAddingRecord}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddRecord}
                    disabled={isAddingRecord || !recordInput.trim()}
                    className="h-7 text-xs"
                  >
                    {isAddingRecord ? '添加中...' : '添加'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddRecord(false)
                      setRecordInput('')
                    }}
                    disabled={isAddingRecord}
                    className="h-7 text-xs"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* 添加记录按钮 */}
            {!showAddRecord && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddRecord(true)}
                className="h-7 text-xs w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                添加记录
              </Button>
            )}
          </div>
        )}
        {/* 如果没有记录且没有显示输入框，显示添加按钮 */}
        {commentRecords.length === 0 && !showAddRecord && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddRecord(true)}
              className="h-7 text-xs w-full"
            >
              <Plus className="h-3 w-3 mr-1" />
              添加记录
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CurrentWeekSection({
  tasks,
  activeTaskId,
  selectedWeekNumber,
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

  // 确定要显示的周数：如果指定了 selectedWeekNumber，使用它；否则使用当前周
  const displayWeekNumber = useMemo(() => {
    if (selectedWeekNumber !== null && selectedWeekNumber !== undefined) {
      return selectedWeekNumber
    }
    // 如果没有选中周，使用当前周（需要从任务中计算）
    if (activeTasks.length > 0) {
      const activeTask = activeTasks[0]
      return getCurrentWeekNumber(activeTask)
    }
    return null
  }, [selectedWeekNumber, activeTasks])

  const handleTodoUpdate = useCallback(
    async (taskId: string, todoIndex: number, completed: boolean) => {
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
    },
    []
  )

  const handleAddRecord = useCallback(
    async (taskId: string, todoIndex: number, recordContent: string) => {
      const response = await fetch('/api/tasks/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, todoIndex, recordContent }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '添加记录失败')
      }

      // 使用 SWR 的 mutate 来重新验证任务列表
      await globalMutate('/api/tasks', undefined, { revalidate: true })
    },
    []
  )

  const handleDeleteRecord = useCallback(
    async (taskId: string, todoIndex: number, recordIndex: number) => {
      const response = await fetch('/api/tasks/comment', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, todoIndex, recordIndex }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除记录失败')
      }

      // 使用 SWR 的 mutate 来重新验证任务列表
      await globalMutate('/api/tasks', undefined, { revalidate: true })
    },
    []
  )

  if (activeTasks.length === 0) {
    return null
  }

  if (displayWeekNumber === null) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {activeTasks.map((task) => {
          const taskStartWeekForTask = getTaskStartWeek(task)
          // 使用选中的周数或当前周数
          const weekNumber = displayWeekNumber
          const taskWeekStartDate = getWeekStartDate(
            weekNumber,
            taskStartWeekForTask
          )

          return (
            <TaskWeekCard
              key={task.id}
              task={task}
              weekNumber={weekNumber}
              weekStartDate={taskWeekStartDate}
              onTodoUpdate={handleTodoUpdate}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          )
        })}
      </div>
    </div>
  )
}
