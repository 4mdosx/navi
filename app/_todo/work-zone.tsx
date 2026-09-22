'use client'

import { useState } from 'react'
import { Coffee, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNoHover } from './use-phone-layout'
import type { Todo, TodoTimeSpan } from '@/types/todo'
import { isNoteKind, isRestKind } from '@/types/todo'
import { sessionLimitMs } from '@/lib/todo-session'
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

function RestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-hit inline-flex h-6 items-center gap-1 rounded-md border border-neutral-200 px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground dark:border-neutral-800"
    >
      <Coffee className="size-3" />
      休息
    </button>
  )
}

export function WorkZone({
  todos,
  spans,
  now,
  onEnter,
  onLeave,
  onRest,
  onSelect,
}: {
  todos: Todo[]
  spans: TodoTimeSpan[]
  now: number
  onEnter: (todoId: string) => void
  onLeave: (todoId: string) => void
  onRest: () => void
  onSelect?: (todo: Todo) => void
}) {
  const [over, setOver] = useState(false)
  const noHover = useNoHover()
  const todoById = new Map(todos.map((todo) => [todo.id, todo]))
  const openSpans = spans.filter((span) => span.endedAt == null)
  const items = openSpans
    .map((span) => {
      const todo = todoById.get(span.todoId)
      if (!todo || isNoteKind(todo.kind)) return null
      return { span, todo }
    })
    .filter((item): item is { span: TodoTimeSpan; todo: Todo } => item != null)
  const restItem = items.find((item) => isRestKind(item.todo.kind))
  const workItems = items.filter((item) => !isRestKind(item.todo.kind))

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
        'mx-3 mt-3 flex min-h-[4.75rem] shrink-0 flex-col rounded-md border border-dashed px-2 py-2 transition-colors',
        over && 'border-sky-400 bg-sky-50 dark:bg-sky-950/40',
        !over && restItem && 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
        !over && !restItem && 'border-neutral-200 bg-muted/20 dark:border-neutral-800',
      )}
    >
      {restItem ? (
        <>
          <div className="flex h-6 shrink-0 items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200">休息中</p>
            <button
              type="button"
              onClick={() => onLeave(restItem.todo.id)}
              className="touch-hit inline-flex h-8 items-center rounded-md border border-amber-300 bg-background px-2 text-[11px] text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
            >
              结束
            </button>
          </div>
          <div className="flex min-h-10 flex-1 items-center justify-center gap-2">
            <Coffee className="size-3.5 text-amber-700 dark:text-amber-300" />
            <p className="text-sm font-medium tabular-nums text-amber-900 dark:text-amber-200">
              {formatElapsed(now - Date.parse(restItem.span.startedAt))} / {formatElapsed(sessionLimitMs(restItem.todo.kind))}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-6 shrink-0 items-center justify-between gap-2">
            <p className="text-[11px] font-medium">工作区</p>
            {workItems.length > 0 ? <RestButton onClick={onRest} /> : null}
          </div>
          {workItems.length === 0 ? (
            <div className="flex min-h-10 flex-1 items-center justify-center gap-3">
              <p className="text-[11px] text-muted-foreground">{noHover ? '在任务菜单里点「开始」' : '拖入开始'}</p>
              <RestButton onClick={onRest} />
            </div>
          ) : (
            <div className="flex min-h-10 flex-1 flex-wrap items-center gap-1.5">
              {workItems.map(({ span, todo }) => (
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
                    {formatElapsed(now - Date.parse(span.startedAt))} / {formatElapsed(sessionLimitMs(todo.kind))}
                  </span>
                  <button
                    type="button"
                    aria-label={`把 ${todo.title} 移出工作区`}
                    onClick={() => onLeave(todo.id)}
                    className="touch-hit ml-0.5 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    移出
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
