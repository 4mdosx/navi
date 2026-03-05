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
import type { Task, WeekCommentRecord } from '@/types/tasks'
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
  onAddRecord?: (
    taskId: string,
    todoIndex: number,
    recordContent: string,
    goal?: number
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
  onAddRecord,
  onDeleteRecord,
}: TaskWeekCardProps) {
  // 显示指定周的记录（week 数组索引 = 周数 - 1）；每项含 id, content, comment（每条含 content, updateAt, goal）
  const weekTodoIndex = weekNumber - 1
  const weekItem = task.week?.[weekTodoIndex]
  const [isAddingRecord, setIsAddingRecord] = useState(false)
  const [isDeletingRecord, setIsDeletingRecord] = useState<number | null>(null)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const isConfirmingDeleteRef = useRef(false)
  const [recordInput, setRecordInput] = useState('')
  const [recordGoal, setRecordGoal] = useState<string>('')
  const [showAddRecord, setShowAddRecord] = useState(false)

  const handleAddRecord = useCallback(async () => {
    if (!onAddRecord || !recordInput.trim()) return

    setIsAddingRecord(true)
    try {
      const goalNum = recordGoal.trim() === '' ? 0 : Number(recordGoal) || 0
      await onAddRecord(task.id, weekTodoIndex, recordInput.trim(), goalNum)
      setRecordInput('')
      setRecordGoal('')
      setShowAddRecord(false)
    } catch (error) {
      console.error('Error adding record:', error)
      alert(error instanceof Error ? error.message : '添加记录失败，请重试')
    } finally {
      setIsAddingRecord(false)
    }
  }, [task.id, weekTodoIndex, recordInput, recordGoal, onAddRecord])

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

  const commentRecords: WeekCommentRecord[] = useMemo(
    () => (Array.isArray(weekItem?.comment) ? weekItem.comment : []),
    [weekItem?.comment]
  )

  const weekGoalSum = useMemo(
    () => commentRecords.reduce((s, r) => s + (Number(r.goal) || 0), 0),
    [commentRecords]
  )
  const taskGoal = task.goal ?? 0
  const weekCompleted = taskGoal > 0 && weekGoalSum >= taskGoal

  if (!weekItem) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground py-4 text-center">
            第{weekNumber}周还没有记录
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
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 指定周的记录：content + comment（每条含 goal）；本周 comment 的 goal 累和 >= task.goal 即本周完成 */}
        <div className="text-sm p-3 rounded-md border bg-muted/50 border-border">
          <div className="flex items-center justify-between gap-2 mb-1">
            {task.goal != null && task.goal > 0 && (
              <span className="text-xs text-muted-foreground">
                本周目标 {task.goal} 分 · 已得 {weekGoalSum} 分
                {weekCompleted && ' · 已完成'}
              </span>
            )}
          </div>
          <div>
              {weekItem.content && (
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
                    {weekItem.content}
                  </ReactMarkdown>
                </div>
              )}
          </div>
        </div>
        {(commentRecords.length > 0 || showAddRecord) && (
          <div className="mt-2 space-y-2">
            {commentRecords.length > 0 && (
              <div className="space-y-1.5">
                {commentRecords.map((record, index) => (
                  <div
                    key={index}
                    className="text-xs text-muted-foreground/70 p-2 bg-muted/30 rounded border border-border/50 group/record"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap">
                          {record.content}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {record.updateAt && (
                            <span className="text-[10px] text-muted-foreground/50">
                              {format(
                                new Date(record.updateAt),
                                'yyyy-MM-dd HH:mm'
                              )}
                            </span>
                          )}
                          {record.goal != null && Number(record.goal) !== 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              得分: {Number(record.goal)}
                            </span>
                          )}
                        </div>
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
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="得分（可选）"
                  value={recordGoal}
                  onChange={(e) => setRecordGoal(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
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
                      setRecordGoal('')
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
      return activeTask?.week && activeTask.week.length > 0 ? [activeTask] : []
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

  const handleAddRecord = useCallback(
    async (
      taskId: string,
      todoIndex: number,
      recordContent: string,
      goal?: number
    ) => {
      const response = await fetch('/api/tasks/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          todoIndex,
          recordContent,
          goal: goal ?? 0,
        }),
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
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          )
        })}
      </div>
    </div>
  )
}
