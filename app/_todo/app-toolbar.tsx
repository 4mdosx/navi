'use client'

import { useEffect, useSyncExternalStore, type ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { CalendarDays, Moon, PanelLeft, Settings, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getColorTheme, subscribeColorTheme, toggleColorTheme } from '@/lib/theme'
import { FocusModeTool } from './todo-tags'

export type WorkspaceViewId = 'week' | 'today'

export const WORKSPACE_VIEWS: {
  id: WorkspaceViewId
  label: string
  shortcut: string
  icon: typeof CalendarDays
}[] = [
  { id: 'week', label: '本周', shortcut: '1', icon: CalendarDays },
  { id: 'today', label: '今天', shortcut: '2', icon: Sun },
]

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function ToolbarButton({
  pressed,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[10px] font-medium leading-none transition-colors',
        pressed
          ? 'bg-muted text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function AppToolbar({
  view,
  onViewChange,
  insightsOpen,
  onToggleInsights,
}: {
  view: WorkspaceViewId
  onViewChange: (view: WorkspaceViewId) => void
  insightsOpen: boolean
  onToggleInsights: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isEditableTarget(event.target)) return
      const shortcut = event.code === 'Digit1' || event.code === 'Numpad1'
        ? '1'
        : event.code === 'Digit2' || event.code === 'Numpad2'
          ? '2'
          : null
      const next = WORKSPACE_VIEWS.find((item) => item.shortcut === shortcut)?.id
      if (!next) return
      event.preventDefault()
      onViewChange(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onViewChange])

  const dark = useSyncExternalStore(subscribeColorTheme, getColorTheme, () => 'light') === 'dark'

  return (
    <nav
      aria-label="工作区工具栏"
      className="relative z-50 flex h-svh w-12 shrink-0 flex-col items-center overflow-visible border-r bg-card py-2"
    >
      <div className="flex w-10 flex-col gap-0.5">
        {WORKSPACE_VIEWS.map((item) => {
          const Icon = item.icon
          return (
            <ToolbarButton
              key={item.id}
              pressed={view === item.id}
              onClick={() => onViewChange(item.id)}
              aria-keyshortcuts={`Meta+${item.shortcut}`}
              title={`${item.label} ⌘${item.shortcut}`}
            >
              <Icon className="size-3.5" />
              <span className="[writing-mode:vertical-rl] tracking-[0.2em]">{item.label}</span>
            </ToolbarButton>
          )
        })}
      </div>

      <div className="my-2 h-px w-6 bg-border" />

      <ToolbarButton
        pressed={insightsOpen}
        onClick={onToggleInsights}
        aria-expanded={insightsOpen}
        aria-controls="todo-insights-drawer"
        title="周视图 ⌥Esc"
        className="w-10"
      >
        <PanelLeft className="size-3.5" />
        <span className="[writing-mode:vertical-rl] tracking-[0.2em]">周视图</span>
        <kbd className="rounded border bg-muted px-0.5 py-px font-mono text-[8px] font-normal text-muted-foreground [writing-mode:horizontal-tb]">
          ⌥Esc
        </kbd>
      </ToolbarButton>

      <FocusModeTool closeWhen={insightsOpen} />

      <div className="mt-auto flex w-10 flex-col items-center gap-0.5">
        <ToolbarButton
          pressed={dark}
          onClick={toggleColorTheme}
          aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
          title={dark ? '切换到浅色模式' : '切换到深色模式'}
          suppressHydrationWarning
        >
          {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          <span className="[writing-mode:vertical-rl] tracking-[0.2em]">{dark ? '浅色' : '深色'}</span>
        </ToolbarButton>
        <Link
          href="/settings"
          aria-label="设置"
          title="设置"
          className="flex w-10 flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-3.5" />
          <span className="[writing-mode:vertical-rl] tracking-[0.2em]">设置</span>
        </Link>
      </div>
    </nav>
  )
}
