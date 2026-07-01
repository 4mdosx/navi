'use client'

import Link from 'next/link'
import { ArrowRight, Calendar, FolderKanban, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TRACKER_KIND_LABELS } from '@/types/tracker'
import type { InboxItem } from '@/types/inbox'
import type { TrackerItem } from '@/types/tracker'
import type { WeekPlanTodo } from '@/types/week-plan'
import {
  apiAddTrackerToWeek,
  apiArchiveInboxItem,
  apiCreateInboxItem,
  apiCreateTracker,
  fetchInboxItems,
  fetchProjectSummaries,
  fetchTrackerItems,
  fetchWeekPlanSummary,
  getCurrentWeekStart,
} from './dashboard-api'

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4', className)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const [now, setNow] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todos, setTodos] = useState<WeekPlanTodo[]>([])
  const [pending, setPending] = useState<{ id: string; title: string; day: number }[]>([])
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([])
  const [dueTrackerItems, setDueTrackerItems] = useState<TrackerItem[]>([])
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [projects, setProjects] = useState<
    { id: string; title: string; goal: number; weekCount: number }[]
  >([])

  const [newTrackerTitle, setNewTrackerTitle] = useState('')
  const [newInboxTitle, setNewInboxTitle] = useState('')
  const [newInboxUrl, setNewInboxUrl] = useState('')

  const todayIndex = new Date().getDay()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [weekData, trackers, dueTrackers, inbox, projectList] = await Promise.all([
        fetchWeekPlanSummary(getCurrentWeekStart()),
        fetchTrackerItems(false),
        fetchTrackerItems(true),
        fetchInboxItems(),
        fetchProjectSummaries(),
      ])
      setTodos(weekData.todos)
      setPending(
        weekData.pending.map((p) => ({ id: p.id, title: p.title, day: p.day }))
      )
      setTrackerItems(trackers.filter((t) => t.status === 'active'))
      setDueTrackerItems(dueTrackers)
      setInboxItems(inbox)
      setProjects(projectList.slice(0, 3))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const activeTodo = useMemo(
    () => todos.find((t) => t.status === 'active'),
    [todos]
  )

  const todayTodos = useMemo(
    () =>
      todos
        .filter((t) => t.dayIndex === todayIndex && t.status !== 'done')
        .sort((a, b) => {
          const order = { active: 0, pending: 1, done: 2 } as const
          return order[a.status] - order[b.status]
        }),
    [todos, todayIndex]
  )

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTrackerTitle.trim()
    if (!title) return
    await apiCreateTracker({ title, kind: 'long_task' })
    setNewTrackerTitle('')
    void load()
  }

  const handleAddTrackerToWeek = async (id: string) => {
    await apiAddTrackerToWeek(id)
    void load()
  }

  const handleCreateInbox = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newInboxTitle.trim()
    if (!title) return
    await apiCreateInboxItem({
      title,
      url: newInboxUrl.trim() || undefined,
    })
    setNewInboxTitle('')
    setNewInboxUrl('')
    void load()
  }

  const handleArchiveInbox = async (id: string) => {
    await apiArchiveInboxItem(id)
    void load()
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <header className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <h1 className="text-2xl font-semibold">Navi</h1>
        <p className="text-sm text-muted-foreground">每日启动点 — 今天该做什么</p>
      </header>

      <SectionCard
        title="今日焦点"
        description="当前进行中的任务"
        action={
          <Link
            href="/week-plan"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            周计划 <ArrowRight className="size-3" />
          </Link>
        }
      >
        {activeTodo ? (
          <div className="rounded-md border border-emerald-300/60 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <p className="font-medium">{activeTodo.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              预计 {activeTodo.estimatedHours} 小时
              {activeTodo.startedAtMs != null && (
                <span className="ml-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                  · {formatElapsed(now - activeTodo.startedAtMs)}
                </span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            暂无进行中任务 —{' '}
            <Link href="/week-plan" className="underline underline-offset-2">
              去周计划开始一项
            </Link>
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="今日待办"
        description={`今天（周${['日', '一', '二', '三', '四', '五', '六'][todayIndex]}）`}
      >
        {todayTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">今天还没有安排任务</p>
        ) : (
          <ul className="space-y-2">
            {todayTodos.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                  t.status === 'active' && 'border-emerald-300/60 bg-emerald-50/30'
                )}
              >
                <span>{t.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t.status === 'active' ? '进行中' : '待开始'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard
          title="待安排活动"
          description={`${pending.length} 项在池中`}
        >
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">池子已空</p>
          ) : (
            <ul className="space-y-1.5">
              {pending.slice(0, 5).map((p) => (
                <li key={p.id} className="truncate text-sm">
                  {p.title}
                  <span className="ml-1 text-xs text-muted-foreground">
                    · {p.day}h
                  </span>
                </li>
              ))}
              {pending.length > 5 && (
                <li className="text-xs text-muted-foreground">
                  还有 {pending.length - 5} 项…
                </li>
              )}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="项目追踪"
          description="长期项目上下文"
          action={
            <Link
              href="/cowork/projects"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              全部 <FolderKanban className="size-3" />
            </Link>
          }
        >
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无项目</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="font-medium">{p.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.weekCount} 周记录
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="长期提醒"
        description="实验、灵感、周期性任务"
        action={
          <Link
            href="/week-plan"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Calendar className="size-3" />
          </Link>
        }
      >
        {dueTrackerItems.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-300/60 bg-amber-50/50 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              该关注了
            </p>
            <ul className="mt-1 space-y-1">
              {dueTrackerItems.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {t.title}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {TRACKER_KIND_LABELS[t.kind]}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => void handleAddTrackerToWeek(t.id)}
                  >
                    纳入本周
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {trackerItems.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">暂无长期任务</p>
        ) : (
          <ul className="mb-3 space-y-1.5">
            {trackerItems.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {t.title}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {TRACKER_KIND_LABELS[t.kind]}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void handleAddTrackerToWeek(t.id)}
                >
                  纳入本周
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => void handleCreateTracker(e)} className="flex gap-2">
          <Input
            value={newTrackerTitle}
            onChange={(e) => setNewTrackerTitle(e.target.value)}
            placeholder="新增长期任务或提醒"
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={!newTrackerTitle.trim()}>
            <Plus className="size-3.5" />
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="信息收件箱"
        description="手动采集 — 后续接入更多来源"
      >
        {inboxItems.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">收件箱为空</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {inboxItems.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium underline-offset-2 hover:underline"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="font-medium">{item.title}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => void handleArchiveInbox(item.id)}
                >
                  归档
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => void handleCreateInbox(e)} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newInboxTitle}
            onChange={(e) => setNewInboxTitle(e.target.value)}
            placeholder="标题"
            className="h-8 text-sm"
          />
          <Input
            value={newInboxUrl}
            onChange={(e) => setNewInboxUrl(e.target.value)}
            placeholder="链接（可选）"
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={!newInboxTitle.trim()}>
            添加
          </Button>
        </form>
      </SectionCard>
    </div>
  )
}
