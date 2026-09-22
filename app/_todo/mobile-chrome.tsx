'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, MoreHorizontal, PanelLeft, Settings, Sun, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getColorTheme, subscribeColorTheme, toggleColorTheme } from '@/lib/theme'
import type { WorkspaceViewId } from './app-toolbar'

export function MobileSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="shrink-0 border-b pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 items-center gap-1 px-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="返回"
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="min-w-0 flex-1 truncate pr-3 text-sm font-semibold">{title}</h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  )
}

export function MobileActionSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rounded-t-2xl border bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground active:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid py-1">{children}</div>
      </div>
    </div>
  )
}

export function MobileAction({
  label,
  destructive,
  disabled,
  onSelect,
}: {
  label: string
  destructive?: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'min-h-12 px-4 text-left text-base disabled:opacity-40',
        destructive ? 'text-destructive' : 'text-foreground',
      )}
    >
      {label}
    </button>
  )
}

export function MobileTabBar({
  view,
  insightsOpen,
  onViewChange,
  onToggleInsights,
}: {
  view: WorkspaceViewId
  insightsOpen: boolean
  onViewChange: (view: WorkspaceViewId) => void
  onToggleInsights: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const dark = useSyncExternalStore(subscribeColorTheme, getColorTheme, () => 'light') === 'dark'

  return (
    <>
      <nav
        aria-label="手机导航"
        className="z-30 shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-14 grid-cols-4">
          <TabButton
            pressed={view === 'week' && !insightsOpen}
            label="本周"
            onClick={() => onViewChange('week')}
          >
            <CalendarDays className="size-5" />
          </TabButton>
          <TabButton
            pressed={view === 'today' && !insightsOpen}
            label="今天"
            onClick={() => onViewChange('today')}
          >
            <Sun className="size-5" />
          </TabButton>
          <TabButton pressed={insightsOpen} label="投入" onClick={onToggleInsights}>
            <PanelLeft className="size-5" />
          </TabButton>
          <TabButton pressed={moreOpen} label="更多" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal className="size-5" />
          </TabButton>
        </div>
      </nav>
      {moreOpen && (
        <MobileActionSheet title="更多" onClose={() => setMoreOpen(false)}>
          <MobileAction
            label={dark ? '切换到浅色' : '切换到深色'}
            onSelect={() => {
              toggleColorTheme()
              setMoreOpen(false)
            }}
          />
          <Link
            href="/settings"
            className="flex min-h-12 items-center gap-2 px-4 text-base"
            onClick={() => setMoreOpen(false)}
          >
            <Settings className="size-4" />
            设置
          </Link>
        </MobileActionSheet>
      )}
    </>
  )
}

function TabButton({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
        pressed ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}
