'use client'

import { useEffect, useRef, useState } from 'react'
import { Ban, Check, ChevronDown, ChevronUp, Circle, Filter, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  TODO_STATUS_LABEL,
  TODO_STATUSES,
  type TodoStatus,
} from '@/types/todo'

const STATUS_ICON = {
  pending: Circle,
  active: Play,
  blocked: Pause,
  done: Check,
  cancelled: Ban,
} as const

export const STATUS_TOKEN: Record<TodoStatus, {
  text: string
  bg: string
  solid: string
  border: string
}> = {
  pending: {
    text: 'text-violet-600 dark:text-violet-400',
    bg: 'todo-status-soft-pending',
    solid: 'todo-status-solid-pending',
    border: 'todo-status-border-pending',
  },
  active: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'todo-status-soft-active',
    solid: 'todo-status-solid-active',
    border: 'todo-status-border-active',
  },
  blocked: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'todo-status-soft-blocked',
    solid: 'todo-status-solid-blocked',
    border: 'todo-status-border-blocked',
  },
  done: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'todo-status-soft-done',
    solid: 'todo-status-solid-done',
    border: 'todo-status-border-done',
  },
  cancelled: {
    text: 'text-neutral-400 dark:text-neutral-500',
    bg: 'todo-status-soft-cancelled',
    solid: 'todo-status-solid-cancelled',
    border: 'todo-status-border-cancelled',
  },
}

function useMenuOpen() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return { open, setOpen, rootRef }
}

export function StatusGlyph({ status, className }: { status: TodoStatus; className?: string }) {
  const Icon = STATUS_ICON[status]
  return (
    <Icon
      data-todo-status={status}
      strokeWidth={2.25}
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    />
  )
}

export function StatusFilterButton({
  selected,
  onChange,
}: {
  selected: Set<TodoStatus>
  onChange: (next: Set<TodoStatus>) => void
}) {
  const { open, setOpen, rootRef } = useMenuOpen()
  const filtered = selected.size !== TODO_STATUSES.length

  const toggle = (status: TodoStatus) => {
    const next = new Set(selected)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    onChange(next)
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn('h-7 gap-1 px-2 text-[11px]', filtered && 'border-primary/40 bg-primary/5')}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Filter className="size-3.5" />
        过滤
        {filtered && (
          <span className="rounded-full bg-primary/10 px-1.5 text-[10px] tabular-nums text-primary">
            {selected.size}
          </span>
        )}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1 w-40 rounded-md border bg-background p-1.5 shadow-md"
        >
          {TODO_STATUSES.map((status) => (
            <label
              key={status}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.has(status)}
                onChange={() => toggle(status)}
                className="size-3.5 accent-primary"
              />
              <StatusGlyph status={status} className="size-3.5" />
              <span data-todo-status={status}>{TODO_STATUS_LABEL[status]}</span>
            </label>
          ))}
          <button
            type="button"
            className="mt-1 w-full rounded px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onChange(new Set(TODO_STATUSES))}
          >
            显示全部状态
          </button>
        </div>
      )}
    </div>
  )
}

export function StatusPicker({
  status,
  disabled,
  compact,
  onChange,
}: {
  status: TodoStatus
  disabled?: boolean
  compact?: boolean
  onChange: (status: TodoStatus) => void
}) {
  const { open, setOpen, rootRef } = useMenuOpen()
  const token = STATUS_TOKEN[status]

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        data-todo-status={status}
        aria-label={`状态：${TODO_STATUS_LABEL[status]}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setOpen((current) => !current)
        }}
        className={cn(
          'flex items-center justify-center disabled:opacity-50',
          compact
            ? cn('size-6 rounded', token.bg)
            : cn('h-7 gap-1 rounded-md border px-2 text-[11px] font-medium', token.bg, token.border),
        )}
      >
        <StatusGlyph status={status} />
        {!compact && (
          <>
            {TODO_STATUS_LABEL[status]}
            <ChevronDown className="size-3 opacity-70" />
          </>
        )}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-1 w-28 rounded-md border bg-background p-1 shadow-md"
        >
          {TODO_STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === status}
              data-todo-status={item}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
                if (item !== status) onChange(item)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted',
                item === status && 'bg-muted font-medium',
              )}
            >
              <StatusGlyph status={item} className="size-3.5" />
              {TODO_STATUS_LABEL[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function EstimatedMinutesControl({
  minutes,
  disabled,
  step = 30,
  onChange,
}: {
  minutes: number
  disabled?: boolean
  step?: number
  onChange: (minutes: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">预计</span>
      <span className="min-w-6 text-center text-sm font-medium tabular-nums">{minutes}</span>
      <span className="text-muted-foreground">分钟</span>
      <div className="ml-1 flex flex-col overflow-hidden rounded border">
        <button
          type="button"
          aria-label={`增加 ${step} 分钟`}
          disabled={disabled}
          onClick={() => onChange(minutes + step)}
          className="flex h-4 w-6 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`减少 ${step} 分钟`}
          disabled={disabled || minutes <= 0}
          onClick={() => onChange(Math.max(0, minutes - step))}
          className="flex h-4 w-6 items-center justify-center border-t text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function StatusChips({
  status,
  disabled,
  onChange,
}: {
  status: TodoStatus
  disabled?: boolean
  onChange: (status: TodoStatus) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {TODO_STATUSES.map((item) => {
        const token = STATUS_TOKEN[item]
        const selected = item === status
        return (
          <button
            key={item}
            type="button"
            disabled={disabled}
            data-todo-status={item}
            onClick={() => item !== status && onChange(item)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px]',
              selected
                ? cn('font-medium', token.bg, token.border)
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {TODO_STATUS_LABEL[item]}
          </button>
        )
      })}
    </div>
  )
}
