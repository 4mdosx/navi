'use client'

import { useState, useEffect } from 'react'
import { TasksView } from './components/tasks-view'
import { SettingsView } from './components/settings-view'
import { ProgressFootprint } from './components/progress-footprint'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTasks } from './hooks/use-tasks'
import type { Task, TaskNote } from '@/types/tasks'

export default function TasksPage() {
  const { tasks: tasksFromDB, isLoading, isError, mutate } = useTasks()
  const [tasks, setTasks] = useState<Task[]>([])
  const [notesMap, setNotesMap] = useState<Record<string, TaskNote[]>>({})

  // 当从 API 获取到数据时更新 tasks
  useEffect(() => {
    if (tasksFromDB && tasksFromDB.length > 0) {
      setTasks(tasksFromDB as Task[])
    } else if (tasksFromDB && tasksFromDB.length === 0) {
      setTasks([])
    }
  }, [tasksFromDB])

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {isError && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">无法加载任务</p>
          <p className="text-sm mt-1">
            {isError.message || '请确保已设置任务路径 (task_path)'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：进度足迹 (4/12) */}
        <div className="col-span-3">
          <ProgressFootprint />
        </div>

        {/* 右侧：任务视图和设置 (8/12) */}
        <div className="col-span-9">
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="tasks">任务</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-0">
              <TasksView
                tasks={tasks}
                notesMap={notesMap}
                onTasksChange={setTasks}
                onNotesMapChange={setNotesMap}
              />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsView />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
