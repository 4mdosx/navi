'use client'

import Link from 'next/link'
import { Check, Circle, GripVertical, Play, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  hasActivityDragPayload,
  parseActivityDragPayload,
  useTodoStore,
  type ActivityDragPayload,
  type TodoItem,
} from './todo-store'

function getSundayOfWeekContaining(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function getYearWeekLabel(date: Date): string {
  const year = date.getFullYear()
  const weekStart = getSundayOfWeekContaining(date)
  const firstWeekStart = getSundayOfWeekContaining(new Date(year, 0, 1))
  const diffDays = Math.floor(
    (weekStart.getTime() - firstWeekStart.getTime()) / 86400000
  )
  const week = Math.floor(diffDays / 7) + 1
  return `${year}年 第${week}周`
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

type WeekDayTab = {
  dayIndex: number
  date: Date
  label: string
  isToday: boolean
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function getVisibleWeekDayTabs(anchor: Date): WeekDayTab[] {
  const sunday = getSundayOfWeekContaining(anchor)
  const today = startOfLocalDay(new Date())
  const tabs: WeekDayTab[] = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + dayIndex)
    const dayStart = startOfLocalDay(date)
    if (dayStart > today) break

    const isToday = dayStart.getTime() === today.getTime()
    const md = `${date.getMonth() + 1}/${date.getDate()}`
    tabs.push({
      dayIndex,
      date,
      label: isToday ? `今天 ${md}` : `${WEEKDAY_LABELS[dayIndex]} ${md}`,
      isToday,
    })
  }
  return tabs
}

function DayTabBar({
  tabs,
  activeDayIndex,
  onActiveDayChange,
}: {
  tabs: WeekDayTab[]
  activeDayIndex: number
  onActiveDayChange: (dayIndex: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="每日待办日期">
      {tabs.map((tab) => {
        const isActive = tab.dayIndex === activeDayIndex
        return (
          <button
            key={tab.dayIndex}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onActiveDayChange(tab.dayIndex)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive &&
                tab.isToday &&
                'border-emerald-300/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100',
              isActive &&
                !tab.isToday &&
                'border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100',
              !isActive &&
                'border-transparent text-neutral-500 hover:border-neutral-200 hover:bg-white hover:text-neutral-900 dark:hover:border-neutral-800 dark:hover:bg-neutral-950 dark:hover:text-neutral-100'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function PendingActivityCard({
  id,
  title,
  day,
  hour,
}: {
  id: string
  title: string
  day: number
  hour: number
}) {
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const onDragStart = (e: React.DragEvent) => {
    const payloadObj = {
      kind: 'week-activity',
      source: 'pending',
      id,
      title,
      day,
      hour,
    } satisfies ActivityDragPayload
    const payload = JSON.stringify(payloadObj)
    setDraggingPayload(payloadObj)
    e.dataTransfer.setData('application/json', payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className="flex max-w-full min-w-0 shrink-0 cursor-grab flex-col justify-start overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-950"
      style={{ width: `${Math.max(hour, 1) * 72}px` }}
    >
      <span className="block min-w-0 truncate font-medium leading-tight">{title}</span>
      <span className="mt-1 text-[10px] text-neutral-500">预计 {day} 小时</span>
    </div>
  )
}

function TodoRow({
  item,
  now,
  onStart,
  onComplete,
  onRemove,
}: {
  item: TodoItem
  now: number
  onStart: () => void
  onComplete: () => void
  onRemove: () => void
}) {
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const isActive = item.status === 'active'
  const isDone = item.status === 'done'
  const elapsed =
    isActive && item.startedAtMs != null ? formatElapsed(now - item.startedAtMs) : null

  const onDragStart = (e: React.DragEvent) => {
    const payloadObj = {
      kind: 'week-activity',
      source: 'todo',
      id: item.id,
      title: item.title,
      day: item.estimatedHours,
      hour: item.hour,
    } satisfies ActivityDragPayload
    const payload = JSON.stringify(payloadObj)
    setDraggingPayload(payloadObj)
    e.dataTransfer.setData('application/json', payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className={cn(
        'group flex cursor-grab items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors active:cursor-grabbing',
        isActive &&
          'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-700/60 dark:bg-emerald-950/30',
        !isActive &&
          !isDone &&
          'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950',
        isDone && 'border-neutral-100 bg-neutral-50/80 opacity-60 dark:border-neutral-800/60 dark:bg-neutral-900/40'
      )}
    >
      <button
        type="button"
        onClick={isDone ? undefined : onComplete}
        disabled={isDone}
        aria-label={isDone ? '已完成' : '标记完成'}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          isDone
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-neutral-300 text-neutral-400 hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-600 dark:hover:border-emerald-500'
        )}
      >
        {isDone ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-medium',
              isDone && 'line-through text-neutral-500'
            )}
          >
            {item.title}
          </span>
          {isActive && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              进行中
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          预计 {item.estimatedHours} 小时
          {elapsed != null && (
            <span className="ml-2 tabular-nums text-emerald-700 dark:text-emerald-400">
              · {elapsed}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!isDone && !isActive && (
          <button
            type="button"
            onClick={onStart}
            aria-label="开始"
            className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <Play className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="移除"
          className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  )
}

function TodoList({
  todos,
  now,
  weekAnchor,
  activeDayIndex,
  onActiveDayChange,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  todos: TodoItem[]
  now: number
  weekAnchor: Date
  activeDayIndex: number
  onActiveDayChange: (dayIndex: number) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  const startTodo = useTodoStore((s) => s.startTodo)
  const completeTodo = useTodoStore((s) => s.completeTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)

  const dayTabs = useMemo(() => getVisibleWeekDayTabs(weekAnchor), [weekAnchor])

  const dayTodos = useMemo(
    () => todos.filter((t) => t.dayIndex === activeDayIndex),
    [todos, activeDayIndex]
  )

  const sorted = useMemo(() => {
    const order = { active: 0, pending: 1, done: 2 } as const
    return [...dayTodos].sort((a, b) => order[a.status] - order[b.status])
  }, [dayTodos])

  const activeCount = dayTodos.filter((t) => t.status === 'active').length
  const doneCount = dayTodos.filter((t) => t.status === 'done').length

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col rounded-lg border transition-colors',
        isDragOver
          ? 'border-dashed border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20'
          : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              每日待办
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {activeCount > 0
                ? `${activeCount} 项进行中`
                : '从右侧拖入活动卡片，自动开始'}
              {doneCount > 0 && ` · 已完成 ${doneCount}`}
            </p>
          </div>
          <GripVertical className="size-4 text-neutral-300 dark:text-neutral-600" />
        </div>

        <DayTabBar
          tabs={dayTabs}
          activeDayIndex={activeDayIndex}
          onActiveDayChange={onActiveDayChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <div
            className={cn(
              'flex h-full min-h-48 flex-col items-center justify-center rounded-md border border-dashed px-6 text-center',
              isDragOver
                ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
                : 'border-neutral-200 text-neutral-400 dark:border-neutral-700'
            )}
          >
            <p className="text-sm font-medium">拖入活动开始当日计划</p>
            <p className="mt-1 text-xs">松开鼠标后事项将自动开始计时</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => (
              <TodoRow
                key={item.id}
                item={item}
                now={now}
                onStart={() => startTodo(item.id)}
                onComplete={() => completeTodo(item.id)}
                onRemove={() => removeTodo(item.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PendingPanel({
  pending,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  pending: { id: string; title: string; day: number; hour: number }[]
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <aside
      className={cn(
        'flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border p-3 transition-colors',
        isDragOver
          ? 'border-dashed border-amber-400 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-950/20'
          : 'border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/40'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          待安排活动
        </h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          拖到左侧自动开始；待办也可拖回此处重新安排。
        </p>
      </div>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-wrap content-start items-start gap-2 overflow-y-auto">
        {pending.map((c) => (
          <PendingActivityCard key={c.id} {...c} />
        ))}
        {pending.length === 0 && (
          <p
            className={cn(
              'w-full rounded-md border border-dashed px-3 py-6 text-center text-xs',
              isDragOver
                ? 'border-amber-400 text-amber-700 dark:text-amber-300'
                : 'border-neutral-200 text-neutral-400 dark:border-neutral-700'
            )}
          >
            {isDragOver ? '松开放回待安排' : '所有活动已加入待办'}
          </p>
        )}
      </div>
    </aside>
  )
}

export default function WeekPlanPage() {
  const currentDate = useMemo(() => new Date(), [])
  const [now, setNow] = useState(() => Date.now())
  const [activeDayIndex, setActiveDayIndex] = useState(() => new Date().getDay())
  const [isTodoDragOver, setIsTodoDragOver] = useState(false)
  const [isPendingDragOver, setIsPendingDragOver] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const visible = getVisibleWeekDayTabs(currentDate)
    if (!visible.some((t) => t.dayIndex === activeDayIndex)) {
      const fallback = visible[visible.length - 1]?.dayIndex ?? new Date().getDay()
      setActiveDayIndex(fallback)
    }
  }, [currentDate, activeDayIndex])

  const pending = useTodoStore((s) => s.pending)
  const todos = useTodoStore((s) => s.todos)
  const draggingPayload = useTodoStore((s) => s.draggingPayload)
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const addTodoFromDrop = useTodoStore((s) => s.addTodoFromDrop)
  const moveTodoBackToPending = useTodoStore((s) => s.moveTodoBackToPending)

  const yearWeekLabel = useMemo(() => getYearWeekLabel(currentDate), [currentDate])

  const handleTodoDragOver = useCallback(
    (e: React.DragEvent) => {
      const payload = draggingPayload
      if (!hasActivityDragPayload(e.dataTransfer) && !payload) return
      if (payload?.source === 'todo') return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsTodoDragOver(true)
    },
    [draggingPayload]
  )

  const handleTodoDragLeave = useCallback(() => {
    setIsTodoDragOver(false)
  }, [])

  const handleTodoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsTodoDragOver(false)
      const payload = parseActivityDragPayload(e.dataTransfer) ?? draggingPayload
      if (!payload || payload.source !== 'pending') return
      addTodoFromDrop(payload, activeDayIndex)
      setDraggingPayload(null)
    },
    [activeDayIndex, addTodoFromDrop, draggingPayload, setDraggingPayload]
  )

  const handlePendingDragOver = useCallback(
    (e: React.DragEvent) => {
      const payload = draggingPayload
      if (!hasActivityDragPayload(e.dataTransfer) && !payload) return
      if (payload?.source === 'pending') return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsPendingDragOver(true)
    },
    [draggingPayload]
  )

  const handlePendingDragLeave = useCallback(() => {
    setIsPendingDragOver(false)
  }, [])

  const handlePendingDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsPendingDragOver(false)
      const payload = parseActivityDragPayload(e.dataTransfer) ?? draggingPayload
      if (!payload || payload.source !== 'todo') return
      moveTodoBackToPending(payload.id)
      setDraggingPayload(null)
    },
    [draggingPayload, moveTodoBackToPending, setDraggingPayload]
  )

  return (
    <div className="mx-auto h-[calc(100vh-6rem)] max-w-7xl p-6">
      <div className="grid h-full gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">{yearWeekLabel}</h1>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/box-editor" className="text-primary underline-offset-4 hover:underline">
                空间编辑器
              </Link>
            </div>
          </div>
          <TodoList
            todos={todos}
            now={now}
            weekAnchor={currentDate}
            activeDayIndex={activeDayIndex}
            onActiveDayChange={setActiveDayIndex}
            isDragOver={isTodoDragOver}
            onDragOver={handleTodoDragOver}
            onDragLeave={handleTodoDragLeave}
            onDrop={handleTodoDrop}
          />
        </div>
        <PendingPanel
          pending={pending}
          isDragOver={isPendingDragOver}
          onDragOver={handlePendingDragOver}
          onDragLeave={handlePendingDragLeave}
          onDrop={handlePendingDrop}
        />
      </div>
    </div>
  )
}
