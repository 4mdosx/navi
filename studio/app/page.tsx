import { Navbar } from './components/navbar'
import { TasksView } from '@/app/tasks/components/tasks-view'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <TasksView />
      </main>
    </div>
  )
}
