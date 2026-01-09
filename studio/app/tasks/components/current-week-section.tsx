'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Task, TaskNote } from '@/types/tasks'
import {
  getCurrentWeekNumber,
  getNotesForWeek,
  getWeekStartDate,
  getTaskStartWeek,
  formatWeekLabel
} from '@/modules/tasks/utils'

interface CurrentWeekSectionProps {
  tasks: Task[]
  notesMap: Record<string, TaskNote[]>
  onAddNote?: (taskId: string, content: string) => void
}

interface TaskWeekCardProps {
  task: Task
  weekNotes: TaskNote[]
  currentWeekNumber: number
  weekStartDate: Date
  onAddNote?: (content: string) => void
}

function TaskWeekCard({
  task,
  weekNotes,
  currentWeekNumber,
  weekStartDate,
  onAddNote
}: TaskWeekCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteContent, setNoteContent] = useState('')

  const handleAddNote = () => {
    if (noteContent.trim() && onAddNote) {
      onAddNote(noteContent.trim())
      setNoteContent('')
      setIsAddingNote(false)
    }
  }

  const handleCancel = () => {
    setNoteContent('')
    setIsAddingNote(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {formatWeekLabel(weekStartDate)}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                进度: {task.progress}%
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                task.status === 'in_progress' && "bg-blue-500/20 text-blue-700 dark:text-blue-400",
                task.status === 'waiting' && "bg-gray-500/20 text-gray-700 dark:text-gray-400",
                task.status === 'paused' && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                task.status === 'completed' && "bg-green-500/20 text-green-700 dark:text-green-400"
              )}>
                {task.status === 'in_progress' && '进行中'}
                {task.status === 'waiting' && '等待中'}
                {task.status === 'paused' && '已暂停'}
                {task.status === 'completed' && '已完成'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* 本周笔记列表 */}
          {weekNotes.length > 0 ? (
            <div className="space-y-2">
              {weekNotes.map((note) => (
                <div
                  key={note.id}
                  className="text-sm p-2 bg-muted/50 rounded-md border border-border"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {format(new Date(note.timestamp), 'MM/dd HH:mm')}
                  </div>
                  <div className="whitespace-pre-wrap">{note.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              本周还没有进展记录
            </div>
          )}

          {/* 添加进展 */}
          {isAddingNote ? (
            <div className="space-y-2">
              <Textarea
                placeholder="记录本周的进展..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
                  添加
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsAddingNote(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加本周进展
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function CurrentWeekSection({ tasks, notesMap, onAddNote }: CurrentWeekSectionProps) {
  // 找到最早的任务来确定当前周
  const currentWeekData = useMemo(() => {
    if (tasks.length === 0) return null

    const earliestTask = tasks.reduce((earliest, task) => {
      const taskStart = getTaskStartWeek(task)
      const earliestStart = getTaskStartWeek(earliest)
      return taskStart < earliestStart ? task : earliest
    }, tasks[0])

    const currentWeekNumber = getCurrentWeekNumber(earliestTask)
    const taskStartWeek = getTaskStartWeek(earliestTask)
    const weekStartDate = getWeekStartDate(currentWeekNumber, taskStartWeek)

    return {
      currentWeekNumber,
      weekStartDate,
      taskStartWeek,
    }
  }, [tasks])

  if (!currentWeekData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          还没有任务
        </CardContent>
      </Card>
    )
  }

  const { currentWeekNumber, weekStartDate, taskStartWeek } = currentWeekData

  // 获取进行中的任务
  const activeTasks = tasks.filter(task => task.status === 'in_progress')

  return (
    <div className="space-y-4">
      {activeTasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            本周没有进行中的任务
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeTasks.map((task) => {
            const taskStartWeekForTask = getTaskStartWeek(task)
            const taskCurrentWeekNumber = getCurrentWeekNumber(task)
            const taskWeekStartDate = getWeekStartDate(taskCurrentWeekNumber, taskStartWeekForTask)
            const weekNotes = getNotesForWeek(task, notesMap[task.id] || [], taskCurrentWeekNumber)

            return (
              <TaskWeekCard
                key={task.id}
                task={task}
                weekNotes={weekNotes}
                currentWeekNumber={taskCurrentWeekNumber}
                weekStartDate={taskWeekStartDate}
                onAddNote={(content) => onAddNote?.(task.id, content)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
