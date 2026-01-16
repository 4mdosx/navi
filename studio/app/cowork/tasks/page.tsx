'use client'

import { useState, useEffect } from 'react'
import { TasksView } from '@/feature/tasks/components/tasks-view'
import { useTasks } from '@/feature/tasks/hooks/use-tasks'
import type { Task } from '@/types/tasks'

export default function TasksPage() {
  const { tasks: tasksFromDB, isError } = useTasks()
  const [tasks, setTasks] = useState<Task[]>([])

  // 当从 API 获取到数据时更新 tasks
  useEffect(() => {
    if (tasksFromDB && tasksFromDB.length > 0) {
      setTasks(tasksFromDB as Task[])
    } else if (tasksFromDB && tasksFromDB.length === 0) {
      setTasks([])
    }
  }, [tasksFromDB])

  return (
    <div className="container mx-auto py-4 max-w-7xl">
      {isError && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">无法加载任务</p>
          <p className="text-sm mt-1">
            {isError.message || '请确保已设置任务路径 (task_path)'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TasksView
            tasks={tasks}
            onTasksChange={setTasks}
          />
        </div>
      </div>
    </div>
  )
}
