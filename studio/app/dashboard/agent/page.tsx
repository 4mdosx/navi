'use client'

import { AgentDashboard } from '@/feature/agent-dashboard'

export default function AgentDashboardPage() {
  return (
    <div className="h-dvh w-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <AgentDashboard />
    </div>
  )
}
