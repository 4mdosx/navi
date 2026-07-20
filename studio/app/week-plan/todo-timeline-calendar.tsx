'use client'

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Todo } from '@/types/todo'

const WEEK_MS = 7 * 86_400_000
const WEEKS_BEFORE = 12
const WEEKS_AFTER = 3
const PAGE_SIZE = 4

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - result.getDay())
  return result
}

function key(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function weekNumber(date: Date) {
  const first = startOfWeek(new Date(date.getFullYear(), 0, 1))
  return Math.floor((startOfWeek(date).getTime() - first.getTime()) / WEEK_MS) + 1
}

function sameWeek(timestamp: string | null, weekStart: Date) {
  return timestamp != null && startOfWeek(new Date(timestamp)).getTime() === weekStart.getTime()
}

export function TodoTimelineCalendar({
  todos,
  compact = false,
  selectedWeekStart,
  onWeekSelect,
}: {
  todos: Todo[]
  compact?: boolean
  selectedWeekStart?: string
  onWeekSelect?: (weekStart: string) => void
}) {
  const [page, setPage] = useState(0)
  const currentWeek = startOfWeek(new Date())
  const weeks = useMemo(() => {
    const first = new Date(currentWeek.getTime() - WEEKS_BEFORE * WEEK_MS)
    return Array.from({ length: WEEKS_BEFORE + WEEKS_AFTER + 1 }, (_, index) =>
      new Date(first.getTime() + index * WEEK_MS)
    )
  }, [currentWeek.getTime()])

  const visibleTodos = useMemo(() =>
    todos
      .filter((todo) => todo.parentId == null && todo.status !== 'cancelled')
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [todos]
  )

  const reverseWeeks = useMemo(() => [...weeks].reverse(), [weeks])
  const totalPages = Math.ceil(reverseWeeks.length / PAGE_SIZE)
  const pageWeeks = reverseWeeks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const rangeLabel = pageWeeks.length === 0
    ? '无时间范围'
    : `${key(pageWeeks[pageWeeks.length - 1])} — ${key(pageWeeks[0])}`
  const currentIndex = reverseWeeks.findIndex((week) => week.getTime() === currentWeek.getTime())
  const goCurrent = () => setPage(Math.max(0, Math.floor(currentIndex / PAGE_SIZE)))

  const pagination = (
    <div className="flex items-center gap-0.5" aria-label="时间进度分页">
      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-7 gap-0.5 px-1.5 text-[10px]">
        <ChevronLeft className="size-3" /> 较新
      </Button>
      <span className="min-w-8 text-center text-[10px] tabular-nums text-muted-foreground">{page + 1}/{totalPages}</span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} className="h-7 gap-0.5 px-1.5 text-[10px]">
        更早 <ChevronRight className="size-3" />
      </Button>
    </div>
  )

  if (compact) {
    return (
      <section className="rounded-lg border bg-card p-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">时间进度日历</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">最近四周的计划与完成节奏</p>
          </div>
          <Button variant="ghost" size="sm" onClick={goCurrent} className="h-7 px-2 text-xs">
            <RotateCcw className="size-3" />
          </Button>
        </div>
        <div className="mb-2 flex items-center justify-between gap-1">
          <span className="truncate text-[10px] text-muted-foreground">{rangeLabel}</span>
          {pagination}
        </div>
        <div className="space-y-2">
          {pageWeeks.map((week) => {
            const weekKey = key(week)
            const weekTodos = visibleTodos.filter((todo) =>
              todo.weekStart === weekKey || sameWeek(todo.updatedAt, week) || sameWeek(todo.completedAt, week)
            )
            const done = weekTodos.filter((todo) => todo.status === 'done').length
            const planned = weekTodos.filter((todo) => todo.placement === 'week_plan' && todo.weekStart === weekKey).length
            const isCurrent = week.getTime() === currentWeek.getTime()
            return (
              <button
                type="button"
                key={weekKey}
                onClick={() => onWeekSelect?.(weekKey)}
                className={cn(
                  'w-full rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-muted/60',
                  isCurrent && 'border-primary/40 bg-primary/5',
                  selectedWeekStart === weekKey && 'ring-2 ring-primary/40'
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">第 {weekNumber(week)} 周{isCurrent ? ' · 本周' : ''}</span>
                  <span className="text-muted-foreground">{planned} 计划 / {done} 完成</span>
                </div>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                  {planned > 0 && <div className="bg-violet-500" style={{ width: `${Math.max(20, ((planned - done) / planned) * 100)}%` }} />}
                  {done > 0 && <div className="bg-emerald-500" style={{ width: `${Math.max(20, (done / Math.max(planned, done)) * 100)}%` }} />}
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex gap-3 border-t pt-2 text-[10px] text-muted-foreground">
          <span>● 紫色 计划</span><span>● 绿色 完成</span>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">时间进度日历</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">横向查看 Todo 的计划、活动与完成进度</p>
        </div>
        <Button variant="ghost" size="sm" onClick={goCurrent} className="gap-1 text-xs">
          <RotateCcw className="size-3" /> 本周
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">逆时间顺序 · {rangeLabel}</span>
        {pagination}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="sticky top-0 z-10 flex border-b bg-card">
            <div className="sticky left-0 z-20 w-56 shrink-0 border-r bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">Todo</div>
            {pageWeeks.map((week, index) => {
              const current = week.getTime() === currentWeek.getTime()
              const end = new Date(week.getTime() + 6 * 86_400_000)
              return (
                <button type="button" onClick={() => onWeekSelect?.(key(week))} key={key(week)} data-week-index={index} className={cn('w-28 shrink-0 border-r px-2 py-2 text-center text-xs hover:bg-muted', current && 'bg-primary/10 text-primary', selectedWeekStart === key(week) && 'ring-2 ring-inset ring-primary/40')}>
                  <p className="font-semibold">第 {weekNumber(week)} 周</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{week.getMonth() + 1}/{week.getDate()}–{end.getMonth() + 1}/{end.getDate()}</p>
                </button>
              )
            })}
          </div>

          {visibleTodos.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">暂无 Todo</div>
          ) : visibleTodos.map((todo) => {
            const createdWeek = startOfWeek(new Date(todo.createdAt)).getTime()
            const endWeek = startOfWeek(new Date(todo.completedAt ?? todo.updatedAt)).getTime()
            return (
              <div key={todo.id} className="flex border-b last:border-b-0">
                <div className="sticky left-0 z-10 w-56 shrink-0 border-r bg-card px-4 py-3">
                  <p className="truncate text-sm font-medium" title={todo.title}>{todo.title}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{todo.estimatedMinutes} 分钟 · {todo.status === 'done' ? '已完成' : todo.status === 'active' ? '进行中' : todo.status === 'blocked' ? '阻塞' : '待开始'}</p>
                </div>
                {pageWeeks.map((week) => {
                  const timestamp = week.getTime()
                  const planned = todo.placement === 'week_plan' && todo.weekStart === key(week)
                  const created = sameWeek(todo.createdAt, week)
                  const updated = sameWeek(todo.updatedAt, week) || sameWeek(todo.startedAt, week)
                  const completed = sameWeek(todo.completedAt, week)
                  const inProgress = todo.status !== 'pending' && timestamp >= createdWeek && timestamp <= endWeek
                  return (
                    <div key={key(week)} title={`${key(week)}${planned ? ' · 已计划' : ''}${updated ? ' · 有活动' : ''}${completed ? ' · 已完成' : ''}`} className="flex h-14 w-28 shrink-0 items-center border-r px-2">
                      <div className={cn(
                        'h-3 w-full rounded-full',
                        !planned && !created && !updated && !completed && !inProgress && 'bg-muted',
                        inProgress && 'bg-blue-200 dark:bg-blue-900',
                        created && 'bg-cyan-400',
                        planned && 'bg-violet-500',
                        updated && 'bg-amber-400',
                        completed && 'bg-emerald-500'
                      )} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-3 text-[10px] text-muted-foreground">
        <span>● 蓝色 进行周期</span><span>● 青色 创建</span><span>● 紫色 已计划</span><span>● 黄色 有活动</span><span>● 绿色 完成</span>
      </div>
    </section>
  )
}
