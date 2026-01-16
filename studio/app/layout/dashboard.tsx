import { Navbar } from '@/components/navbar'
import { ProgressFootprint } from '@/components/progress-footprint'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <aside className="w-64 p-4">
          <ProgressFootprint />
        </aside>
        <main className="flex-1 pr-4">
          {children}
        </main>
      </div>
    </div>
  )
}
