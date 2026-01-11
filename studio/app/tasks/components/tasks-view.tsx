'use client'

import { useState, useCallback, useMemo } from 'react'
import { v4 as uuid } from 'uuid'
import { WeekTimelineView } from './week-timeline-view'
import { CurrentWeekSection } from './current-week-section'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTasks } from '../hooks/use-tasks'
import type { Task, TaskNote } from '@/types/tasks'
import { getCurrentWeekNumber, getTaskStartWeek, getWeekStartDate } from '@/backstage/tasks/utils'

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
  const [internalTasks, setInternalTasks] = useState<Task[]>([])
  const [internalNotesMap, setInternalNotesMap] = useState<Record<string, TaskNote[]>>({})
  const { createTask } = useTasks()

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

  const handleCreateTask = useCallback(async () => {
    const title = prompt('请输入任务标题:')
    if (!title) {
      return
    }

    try {
      await createTask(title)
    } catch (error) {
      console.error('Error creating task:', error)
      alert(error instanceof Error ? error.message : '创建任务失败，请重试')
    }
  }, [createTask])

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
              <Button
                variant="outline"
                onClick={handleCreateTask}
                className="mt-4"
              >
                创建任务
              </Button>
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
