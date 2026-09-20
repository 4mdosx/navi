'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Todo, TodoStatus } from '@/types/todo'
import {
  buildWeekList,
  formatWeekDateKey,
  startOfWeek,
  TIMELINE_PAGE_SIZE,
  weekNumber,
} from './todo-timeline-weeks'

const PAGE_SIZE = TIMELINE_PAGE_SIZE

const STATUS_ORDER = ['done', 'active', 'blocked', 'pending'] as const satisfies readonly TodoStatus[]

const STATUS_BAR_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  done: 'bg-emerald-500 dark:bg-emerald-400',
  active: 'bg-sky-500 dark:bg-sky-400',
  blocked: 'bg-amber-500 dark:bg-amber-400',
  pending: 'bg-violet-500 dark:bg-violet-400',
}

const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  done: '已完成',
  active: '进行中',
  blocked: '阻塞',
  pending: '待开始',
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
  const weeks = useMemo(() => buildWeekList(new Date()), [currentWeek.getTime()])

  const visibleTodos = useMemo(() =>
    todos
      .filter((todo) => todo.parentId == null && todo.status !== 'cancelled')
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [todos]
  )

  const reverseWeeks = useMemo(() => [...weeks].reverse(), [weeks])
  const totalPages = Math.ceil(reverseWeeks.length / PAGE_SIZE)
  const pageWeeks = reverseWeeks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const currentIndex = reverseWeeks.findIndex((week) => week.getTime() === currentWeek.getTime())
  const currentPageIndex = Math.max(0, Math.floor(currentIndex / PAGE_SIZE))
  const currentWeekKey = formatWeekDateKey(currentWeek)
  const isSelectedCurrentWeek = selectedWeekStart === currentWeekKey
  const goCurrent = () => {
    setPage(currentPageIndex)
    onWeekSelect?.(currentWeekKey)
  }

  const compactPagination = (
    <div className="flex shrink-0 items-center gap-0.5" aria-label="时间进度分页">
      <Button
        variant="ghost"
        size="sm"
        onClick={goCurrent}
        tabIndex={isSelectedCurrentWeek ? -1 : 0}
        aria-hidden={isSelectedCurrentWeek}
        className={cn(
          'h-7 px-2 text-[10px]',
          isSelectedCurrentWeek && 'invisible pointer-events-none'
        )}
      >
        返回
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={page === 0}
        onClick={() => setPage((value) => Math.max(0, value - 1))}
        className="h-7 px-2 text-[10px]"
      >
        上一页
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
        className="h-7 px-2 text-[10px]"
      >
        下一页
      </Button>
    </div>
  )

  const fullPagination = (
    <div className="flex items-center gap-0.5" aria-label="时间进度分页">
      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-7 gap-0.5 px-1.5 text-[10px]">
        较新
      </Button>
      <span className="min-w-8 text-center text-[10px] tabular-nums text-muted-foreground">{page + 1}/{totalPages}</span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} className="h-7 gap-0.5 px-1.5 text-[10px]">
        更早
      </Button>
    </div>
  )
  const rangeLabel = pageWeeks.length === 0
    ? '无时间范围'
    : `${formatWeekDateKey(pageWeeks[pageWeeks.length - 1])} — ${formatWeekDateKey(pageWeeks[0])}`

  if (compact) {
    return (
      <section className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">时间进度日历</h2>
            {compactPagination}
          </div>
          <div className="space-y-2">
            {pageWeeks.map((week) => {
              const weekKey = formatWeekDateKey(week)
              const weekTodos = visibleTodos.filter((todo) =>
                todo.weekStart === weekKey || sameWeek(todo.updatedAt, week) || sameWeek(todo.completedAt, week)
              )
              const planned = weekTodos.filter(
                (todo) => todo.placement === 'week_plan' && todo.weekStart === weekKey
              ).length
              const done = weekTodos.filter((todo) => todo.status === 'done').length
              const isCurrent = week.getTime() === currentWeek.getTime()
              const statusCounts = STATUS_ORDER.map((status) => ({
                status,
                count: weekTodos.filter((todo) => todo.status === status).length,
              })).filter((item) => item.count > 0)
              const progressTotal = statusCounts.reduce((sum, item) => sum + item.count, 0)

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
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    {progressTotal > 0 ? (
                      <div className="flex h-full w-full">
                        {statusCounts.map(({ status, count }) => (
                          <div
                            key={status}
                            title={`${STATUS_LABEL[status]} ${count}`}
                            className={cn('h-full shrink-0', STATUS_BAR_COLOR[status])}
                            style={{ width: `${(count / progressTotal) * 100}%` }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground">
            {STATUS_ORDER.map((status) => (
              <span key={status} className="inline-flex items-center gap-1">
                <span className={cn('size-1.5 rounded-full', STATUS_BAR_COLOR[status])} />
                {STATUS_LABEL[status]}
              </span>
            ))}
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
          本周
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">逆时间顺序 · {rangeLabel}</span>
        {fullPagination}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="sticky top-0 z-10 flex border-b bg-card">
            <div className="sticky left-0 z-20 w-56 shrink-0 border-r bg-card px-4 py-3 text-xs font-semibold text-muted-foreground">Todo</div>
            {pageWeeks.map((week, index) => {
              const current = week.getTime() === currentWeek.getTime()
              const end = new Date(week.getTime() + 6 * 86_400_000)
              return (
                <button type="button" onClick={() => onWeekSelect?.(formatWeekDateKey(week))} key={formatWeekDateKey(week)} data-week-index={index} className={cn('w-28 shrink-0 border-r px-2 py-2 text-center text-xs hover:bg-muted', current && 'bg-primary/10 text-primary', selectedWeekStart === formatWeekDateKey(week) && 'ring-2 ring-inset ring-primary/40')}>
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
                  const planned = todo.placement === 'week_plan' && todo.weekStart === formatWeekDateKey(week)
                  const created = sameWeek(todo.createdAt, week)
                  const updated = sameWeek(todo.updatedAt, week) || sameWeek(todo.startedAt, week)
                  const completed = sameWeek(todo.completedAt, week)
                  const inProgress = todo.status !== 'pending' && timestamp >= createdWeek && timestamp <= endWeek
                  return (
                    <div key={formatWeekDateKey(week)} title={`${formatWeekDateKey(week)}${planned ? ' · 已计划' : ''}${updated ? ' · 有活动' : ''}${completed ? ' · 已完成' : ''}`} className="flex h-14 w-28 shrink-0 items-center border-r px-2">
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
