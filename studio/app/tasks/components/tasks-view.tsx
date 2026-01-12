'use client'

import { useState, useCallback } from 'react'
import { WeekTimelineView } from './week-timeline-view'
import { CurrentWeekSection } from './current-week-section'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTasks } from '../hooks/use-tasks'
import type { Task } from '@/types/tasks'

interface TasksViewProps {
  tasks?: Task[]
  onTasksChange?: (tasks: Task[]) => void
}

export function TasksView({
  tasks: externalTasks,
  onTasksChange,
}: TasksViewProps = {} as TasksViewProps) {
  const [internalTasks, setInternalTasks] = useState<Task[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const { createTask } = useTasks()

  const tasks = externalTasks ?? internalTasks

  const setTasks = (newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    const updated = typeof newTasks === 'function' ? newTasks(tasks) : newTasks
    if (onTasksChange) {
      onTasksChange(updated)
    } else {
      setInternalTasks(updated)
    }
  }


  const handleTaskClick = useCallback((task: Task) => {
    // 切换激活状态：如果点击的是已激活的任务，则取消激活；否则激活该任务
    setActiveTaskId(prev => prev === task.id ? null : task.id)
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
              activeTaskId={activeTaskId}
            />
          )}
        </CardContent>
      </Card>

      {/* 本周进展区域 */}
      <CurrentWeekSection
        tasks={tasks}
        activeTaskId={activeTaskId}
      />
    </div>
  )
}
