'use client'

import { useState } from 'react'
import { TasksView } from './components/tasks-view'
import { ProgressFootprint } from './components/progress-footprint'
import { mockTasks, mockNotes } from '@/backstage/tasks/mock-data'
import type { Task, TaskNote } from '@/types/tasks'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [notesMap, setNotesMap] = useState<Record<string, TaskNote[]>>(mockNotes)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：进度足迹 (4/12) */}
        <div className="col-span-3">
          <ProgressFootprint />
        </div>

        {/* 右侧：任务视图 (8/12) */}
        <div className="col-span-9">
          <TasksView
            tasks={tasks}
            notesMap={notesMap}
            onTasksChange={setTasks}
            onNotesMapChange={setNotesMap}
          />
        </div>
      </div>
    </div>
  )
}
