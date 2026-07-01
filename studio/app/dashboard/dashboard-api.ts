import type { InboxItem } from '@/types/inbox'
import type { TrackerItem } from '@/types/tracker'
import type { WeekPlanData } from '@/types/week-plan'
import { formatWeekStart } from '@/backstage/week-plan/week-utils'

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Request failed')
  }
  return data as T
}

export function getCurrentWeekStart(): string {
  return formatWeekStart(new Date())
}

export async function fetchWeekPlanSummary(weekStart?: string): Promise<WeekPlanData> {
  const ws = weekStart ?? getCurrentWeekStart()
  const res = await fetch(`/api/week-plan?weekStart=${encodeURIComponent(ws)}`, {
    credentials: 'include',
  })
  return parseJson<WeekPlanData>(res)
}

export async function fetchTrackerItems(dueOnly = false): Promise<TrackerItem[]> {
  const res = await fetch(`/api/tracker${dueOnly ? '?due=1' : ''}`, {
    credentials: 'include',
  })
  return parseJson<TrackerItem[]>(res)
}

export async function fetchInboxItems(): Promise<InboxItem[]> {
  const res = await fetch('/api/inbox?status=inbox', { credentials: 'include' })
  return parseJson<InboxItem[]>(res)
}

export async function apiCreateTracker(input: {
  title: string
  kind?: TrackerItem['kind']
  cadence?: TrackerItem['cadence']
}): Promise<TrackerItem> {
  const res = await fetch('/api/tracker', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ item: TrackerItem }>(res)
  return data.item
}

export async function apiAddTrackerToWeek(id: string): Promise<void> {
  const res = await fetch('/api/tracker', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addToWeek', id }),
  })
  await parseJson(res)
}

export async function apiCreateInboxItem(input: {
  title: string
  url?: string
  notes?: string
}): Promise<InboxItem> {
  const res = await fetch('/api/inbox', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, source: 'manual' }),
  })
  const data = await parseJson<{ item: InboxItem }>(res)
  return data.item
}

export async function apiArchiveInboxItem(id: string): Promise<void> {
  const res = await fetch('/api/inbox', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status: 'archived' }),
  })
  await parseJson(res)
}

type ProjectSummary = { id: string; title: string; goal: number; weekCount: number }

export async function fetchProjectSummaries(): Promise<ProjectSummary[]> {
  const res = await fetch('/api/projects', { credentials: 'include' })
  if (!res.ok) return []
  const projects = (await res.json()) as Array<{
    id: string
    title: string
    goal: number
    week?: unknown[]
  }>
  if (!Array.isArray(projects)) return []
  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    goal: p.goal,
    weekCount: Array.isArray(p.week) ? p.week.length : 0,
  }))
}
