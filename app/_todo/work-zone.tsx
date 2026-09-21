'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Todo, TodoTimeSpan } from '@/types/todo'
import { isNoteKind } from '@/types/todo'
import { OUTLINE_DRAG_TYPE, WORKSPACE_DRAG_TYPE, hasOutlineDrag } from './todo-drag'
import { StatusGlyph } from './todo-status'

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function WorkZone({
  todos,
  spans,
  now,
  onEnter,
  onLeave,
  onSelect,
}: {
  todos: Todo[]
  spans: TodoTimeSpan[]
  now: number
  onEnter: (todoId: string) => void
  onLeave: (todoId: string) => void
  onSelect?: (todo: Todo) => void
}) {
  const [over, setOver] = useState(false)
  const todoById = new Map(todos.map((todo) => [todo.id, todo]))
  const openSpans = spans.filter((span) => span.endedAt == null)
  const items = openSpans
    .map((span) => {
      const todo = todoById.get(span.todoId)
      if (!todo || isNoteKind(todo.kind)) return null
      return { span, todo }
    })
    .filter((item): item is { span: TodoTimeSpan; todo: Todo } => item != null)

  return (
    <div
      aria-label="工作区"
      onDragOver={(event) => {
        if (!hasOutlineDrag(event)) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setOver(false)
      }}
      onDrop={(event) => {
        const todoId = event.dataTransfer.getData(OUTLINE_DRAG_TYPE)
        setOver(false)
        if (!todoId) return
        event.preventDefault()
        event.stopPropagation()
        onEnter(todoId)
      }}
      className={cn(
        'mx-3 mt-3 shrink-0 rounded-md border border-dashed px-2 py-2 transition-colors',
        over ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40' : 'border-neutral-200 bg-muted/20 dark:border-neutral-800',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium">工作区</p>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-muted-foreground">
          拖入开始
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(({ span, todo }) => (
            <div
              key={span.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(WORKSPACE_DRAG_TYPE, todo.id)
                event.dataTransfer.setData('text/plain', todo.id)
                event.dataTransfer.effectAllowed = 'move'
              }}
              className="flex max-w-full cursor-grab items-center gap-1 rounded-md border border-sky-200 bg-background px-1.5 py-1 text-xs shadow-sm active:cursor-grabbing dark:border-sky-900"
            >
              <GripVertical className="size-3 shrink-0 text-muted-foreground" />
              <StatusGlyph status="active" className="size-3 shrink-0" />
              <button
                type="button"
                onClick={() => onSelect?.(todo)}
                className="min-w-0 truncate font-medium"
              >
                {todo.title}
              </button>
              <span className="shrink-0 tabular-nums text-[10px] text-sky-600 dark:text-sky-400">
                {formatElapsed(now - Date.parse(span.startedAt))}
              </span>
              <button
                type="button"
                aria-label={`把 ${todo.title} 移出工作区`}
                onClick={() => onLeave(todo.id)}
                className="ml-0.5 rounded px-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                移出
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
