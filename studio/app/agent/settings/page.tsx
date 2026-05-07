'use client'

import Link from 'next/link'

import { AgentDashboard } from '@/feature/agent-dashboard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/agent/chat', label: '对话' },
  { href: '/agent/settings', label: '设置' },
] as const

export default function AgentSettingsPage() {
  return (
    <div className="h-dvh w-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded px-3 py-1.5 text-sm transition-colors',
                tab.href === '/agent/settings'
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/dashboard">返回 Dashboard</Link>
        </Button>
      </div>
      <AgentDashboard mode="settings" />
    </div>
  )
}
