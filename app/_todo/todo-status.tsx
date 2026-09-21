'use client'

import { useEffect, useRef, useState } from 'react'
import { Ban, Check, Circle, Filter, Pause, Play } from 'lucide-react'
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

const STATUS_CLASS: Record<TodoStatus, string> = {
  pending: 'text-violet-600',
  active: 'text-sky-600',
  blocked: 'text-amber-600',
  done: 'text-emerald-600',
  cancelled: 'text-muted-foreground',
}

export function StatusGlyph({ status, className }: { status: TodoStatus; className?: string }) {
  const Icon = STATUS_ICON[status]
  return <Icon className={cn('size-4', STATUS_CLASS[status], className)} />
}

export function StatusFilterButton({
  selected,
  onChange,
}: {
  selected: Set<TodoStatus>
  onChange: (next: Set<TodoStatus>) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const filtered = selected.size !== TODO_STATUSES.length

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

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
              {TODO_STATUS_LABEL[status]}
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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={`状态：${TODO_STATUS_LABEL[status]}`}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setOpen((current) => !current)
        }}
        className={cn(
          'flex items-center justify-center rounded text-muted-foreground hover:bg-background disabled:opacity-50',
          compact ? 'size-6' : 'h-7 gap-1 px-2 text-[11px] hover:text-foreground',
        )}
      >
        <StatusGlyph status={status} />
        {!compact && TODO_STATUS_LABEL[status]}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1 w-28 rounded-md border bg-background p-1 shadow-md"
        >
          {TODO_STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              role="menuitem"
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
      {TODO_STATUSES.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => item !== status && onChange(item)}
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px]',
            item === status
              ? 'border-primary/30 bg-primary/10 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {TODO_STATUS_LABEL[item]}
        </button>
      ))}
    </div>
  )
}
