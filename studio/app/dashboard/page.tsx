'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Todo } from '@/types/todo'

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`
}

export default function DashboardPage() {
  const [now, setNow] = useState(() => Date.now())
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/todos?status=active', { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || '加载失败')
        setTodos(result.data)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const activeTodo = useMemo(
    () => [...todos].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0],
    [todos]
  )

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Navi</h1>
        <p className="mt-1 text-sm text-muted-foreground">每日启动点</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">今日焦点</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">当前进行中的任务</p>
          </div>
          <Link href="/week-plan" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Todo 中心 <ArrowRight className="size-3" />
          </Link>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">加载中…</p> : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : activeTodo ? (
          <div className="rounded-md border border-emerald-300/60 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <p className="font-medium">{activeTodo.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              预计 {formatDuration(activeTodo.estimatedMinutes)}
              {activeTodo.startedAt && (
                <span className="ml-2 tabular-nums text-emerald-700 dark:text-emerald-400">· {formatElapsed(now - Date.parse(activeTodo.startedAt))}</span>
              )}
            </p>
            {activeTodo.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{activeTodo.description}</p>}
            {activeTodo.content && <p className="mt-2 line-clamp-2 rounded border bg-background/60 px-2 py-1.5 text-xs text-muted-foreground">当前进度：{activeTodo.content}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无进行中任务 — <Link href="/week-plan" className="underline underline-offset-2">进入 Todo 中心</Link></p>
        )}
      </section>
    </main>
  )
}
