import { Navbar } from './components/navbar'
import TasksPage from './tasks/page'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <TasksPage />
      </main>
    </div>
  )
}