'use client'

import { useState, useCallback, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { WeekTimelineView } from './week-timeline-view'
import { CurrentWeekSection } from './current-week-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Task, TaskNote } from '@/types/tasks'
import { mockTasks, mockNotes } from '@/modules/tasks/mock-data'
import { getCurrentWeekNumber, getTaskStartWeek, getWeekStartDate, formatWeekLabel } from '@/modules/tasks/utils'

interface TasksViewProps {
  tasks?: Task[]
  notesMap?: Record<string, TaskNote[]>
  onTasksChange?: (tasks: Task[]) => void
  onNotesMapChange?: (notesMap: Record<string, TaskNote[]>) => void
}

export function TasksView({
  tasks: externalTasks,
  notesMap: externalNotesMap,
  onTasksChange,
  onNotesMapChange
}: TasksViewProps = {} as TasksViewProps) {
  const [internalTasks, setInternalTasks] = useState<Task[]>(mockTasks)
  const [internalNotesMap, setInternalNotesMap] = useState<Record<string, TaskNote[]>>(mockNotes)

  const tasks = externalTasks ?? internalTasks
  const notesMap = externalNotesMap ?? internalNotesMap

  const setTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    const updated = typeof newTasks === 'function' ? newTasks(tasks) : newTasks
    if (onTasksChange) {
      onTasksChange(updated)
    } else {
      setInternalTasks(updated)
    }
  }

  const setNotesMap = (newNotesMap: Record<string, TaskNote[]> | ((prev: Record<string, TaskNote[]>) => Record<string, TaskNote[]>)) => {
    const updated = typeof newNotesMap === 'function' ? newNotesMap(notesMap) : newNotesMap
    if (onNotesMapChange) {
      onNotesMapChange(updated)
    } else {
      setInternalNotesMap(updated)
    }
  }

  // 计算当前周信息用于标题显示
  const currentWeekInfo = useMemo(() => {
    if (tasks.length === 0) return null

    const earliestTask = tasks.reduce((earliest, task) => {
      const taskStart = getTaskStartWeek(task)
      const earliestStart = getTaskStartWeek(earliest)
      return taskStart < earliestStart ? task : earliest
    }, tasks[0])

    const currentWeekNumber = getCurrentWeekNumber(earliestTask)
    const taskStartWeek = getTaskStartWeek(earliestTask)
    const weekStartDate = getWeekStartDate(currentWeekNumber, taskStartWeek)

    // 计算已过的天数（周一是第1天，周日是第7天）
    const now = new Date()
    // 将日期重置为当天的 00:00:00，只比较日期部分
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate())
    const weekEndDate = new Date(weekStart)
    weekEndDate.setDate(weekEndDate.getDate() + 6) // 周日

    let passedDays = 0
    if (today >= weekStart) {
      if (today > weekEndDate) {
        // 如果已经过了这周，全部显示为已过
        passedDays = 7
      } else {
        // 计算从周一到今天过了多少天（包括今天）
        const diffTime = today.getTime() - weekStart.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 因为包括今天
        passedDays = Math.min(Math.max(diffDays, 0), 7)
      }
    }

    return {
      currentWeekNumber,
      weekStartDate,
      passedDays,
    }
  }, [tasks])

  const handleAddNote = useCallback((taskId: string, content: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const now = new Date()
    const taskStartWeek = getTaskStartWeek(task)
    const currentWeekNumber = getCurrentWeekNumber(task)
    const weekStartDate = new Date(taskStartWeek)
    weekStartDate.setDate(weekStartDate.getDate() + (currentWeekNumber - 1) * 7)

    const newNote: TaskNote = {
      id: uuid(),
      type: 'text',
      content,
      timestamp: now.toISOString(),
      metadata: {
        weekNumber: currentWeekNumber,
        weekStartDate: weekStartDate.toISOString(),
      },
    }

    setNotesMap(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newNote],
    }))

    // 更新任务的 lastActiveAt
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, lastActiveAt: now.toISOString(), updatedAt: now.toISOString() }
        : t
    ))
  }, [tasks])

  const handleTaskClick = useCallback((task: Task) => {
    // 可以在这里实现任务详情页面的跳转
    console.log('Task clicked:', task.id)
  }, [])

  return (
    <div>
      {/* 周视图时间线 */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-muted-foreground mb-2">还没有任务</div>
              <p className="text-sm text-muted-foreground/70">
                创建一个开始追踪你的长期任务吧
              </p>
            </div>
          ) : (
            <WeekTimelineView
              tasks={tasks}
              visibleWeeks={20}
              onTaskClick={handleTaskClick}
            />
          )}
        </CardContent>
      </Card>

      {/* 本周进展区域 */}
      <CurrentWeekSection
        tasks={tasks}
        notesMap={notesMap}
        onAddNote={handleAddNote}
      />
    </div>
  )
}
