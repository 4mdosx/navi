'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, CornerUpLeft, Minus, Pause, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Todo } from '@/types/todo'
import type { TodayExecution, WorkItem } from '@/types/execution'
import type { LongTermPlanWithProgress } from '@/types/long-term-plan'

const time = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const shiftWeek = (weekStart: string, offset: number) => {
  const [year, month, day] = weekStart.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + offset * 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

type Detail = { title: string; description: string; plannedMinutes: number; meta?: string; todoId?: string }

export function TodayExecutionCenter({ todos, plans, onPlanCheckIn, onPlanTargetChange, onTodosChanged }: { todos: Todo[]; plans: LongTermPlanWithProgress[]; onPlanCheckIn: (planId: string) => Promise<void>; onPlanTargetChange: (planId: string, targetCount: number) => Promise<void>; onTodosChanged: () => void }) {
  const [view, setView] = useState<'today' | 'map' | 'plans'>('today')
  const [data, setData] = useState<TodayExecution>({ items: [], sessions: [] })
  const [selected, setSelected] = useState<Detail | null>(null)
  const [reordering, setReordering] = useState(false)
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null)
  const [planHistoryOffsets, setPlanHistoryOffsets] = useState<Record<string, number>>({})
  const load = useCallback(() => fetch('/api/execution/today').then((r) => r.json()).then((r) => setData(r.data)), [])
  useEffect(() => { void load() }, [load])
  const action = (id: string, actionName: string) => fetch('/api/execution/today', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: actionName }) }).then((r) => r.json()).then((r) => setData(r.data))
  const promote = (todoId: string) => fetch('/api/execution/today', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'promote', todoId }) }).then((r) => r.json()).then((r) => { setData(r.data); setView('today') })
  const active = data.items.find((item) => item.state === 'active')
  const queue = data.items.filter((item) => item.state !== 'active' && item.state !== 'done')
  const todoById = useMemo(() => new Map(todos.map((todo) => [todo.id, todo])), [todos])
  const childrenByParentId = useMemo(() => {
    const grouped = new Map<string, Todo[]>()
    for (const todo of todos) {
      if (!todo.parentId) continue
      grouped.set(todo.parentId, [...(grouped.get(todo.parentId) ?? []), todo])
    }
    for (const children of grouped.values()) children.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
    return grouped
  }, [todos])
  const parentLabel = (todo: Todo) => todo.parentId ? todoById.get(todo.parentId)?.title : null
  const selectTodo = (todo: Todo, state?: string) => {
    const parent = parentLabel(todo)
    setSelected({
      title: todo.title,
      description: todo.description,
      plannedMinutes: todo.estimatedMinutes,
      meta: parent ? `属于：${parent} · ${state ?? todo.status}` : `${todo.kind} · ${state ?? todo.status}`,
      todoId: todo.id,
    })
  }
  const selectWorkItem = (item: WorkItem) => {
    const source = item.sourceType === 'todo' ? todoById.get(item.sourceId) : null
    if (source) return selectTodo(source, item.state)
    setSelected({ title: item.title, description: item.description, plannedMinutes: item.plannedMinutes, meta: item.state })
  }
  const selectedTodo = selected?.todoId ? todoById.get(selected.todoId) : null
  const selectedParent = selectedTodo?.parentId ? todoById.get(selectedTodo.parentId) : null
  const selectedChildren = selectedTodo ? childrenByParentId.get(selectedTodo.id) ?? [] : []
  const moveChild = async (childIndex: number, direction: -1 | 1) => {
    const nextIndex = childIndex + direction
    if (nextIndex < 0 || nextIndex >= selectedChildren.length || reordering) return
    const reordered = [...selectedChildren]
    const [child] = reordered.splice(childIndex, 1)
    reordered.splice(nextIndex, 0, child)
    setReordering(true)
    try {
      const responses = await Promise.all(reordered.map((todo, index) => fetch(`/api/todos/${encodeURIComponent(todo.id)}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: index }),
      })))
      if (responses.some((response) => !response.ok)) throw new Error('子任务排序保存失败')
      onTodosChanged()
    } finally {
      setReordering(false)
    }
  }
  const lanes = useMemo(() => [
    { title: '已安排', items: todos.filter((t) => t.placement === 'week_plan' && !['done', 'cancelled'].includes(t.status)) },
    { title: 'Backlog', items: todos.filter((t) => t.placement === 'backlog' && t.status === 'pending' && !t.activationCondition) },
    { title: '等待', items: todos.filter((t) => t.status === 'blocked' || Boolean(t.activationCondition)) },
  ], [todos])
  return <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b p-3"><div><h2 className="font-semibold">{view === 'today' ? '今天' : view === 'map' ? '任务地图' : '长期计划'}</h2><p className="text-xs text-muted-foreground">{view === 'today' ? '按顺序执行，并保留真实切换时间' : view === 'map' ? '管理、排期或提前到今天' : '每周独立计数，打卡记录永久保留'}</p></div><div className="rounded-md bg-muted p-1"><button className={`rounded px-3 py-1 text-xs ${view === 'today' ? 'bg-background shadow' : ''}`} onClick={() => setView('today')}>今天</button><button className={`rounded px-3 py-1 text-xs ${view === 'map' ? 'bg-background shadow' : ''}`} onClick={() => setView('map')}>任务地图</button><button className={`rounded px-3 py-1 text-xs ${view === 'plans' ? 'bg-background shadow' : ''}`} onClick={() => setView('plans')}>长期计划</button></div></header>
      {view === 'today' ? <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {active ? <div className="mb-3 rounded-lg border border-sky-400 bg-sky-50/50 p-4"><p className="text-xs text-sky-700">正在执行</p><button onClick={() => selectWorkItem(active)} className="mt-1 text-left text-lg font-semibold">{active.title}</button><div className="mt-3 flex gap-2"><Button onClick={() => void action(active.id, 'pause')} variant="outline"><Pause className="mr-1 size-4" />暂停</Button><Button onClick={() => void action(active.id, 'complete')}><Check className="mr-1 size-4" />完成</Button></div></div> : <div className="mb-3 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">尚未开始任务</div>}
        <h3 className="mb-2 text-sm font-semibold">今日队列</h3><div className="space-y-2">{queue.map((item, index) => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span><button onClick={() => selectWorkItem(item)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-[10px] text-muted-foreground">{item.plannedMinutes} 分钟 · {item.priority}</p></button><Button size="sm" variant="outline" onClick={() => void action(item.id, 'start')}><Play className="mr-1 size-3" />开始</Button></div>)}</div>
        <h3 className="mb-2 mt-5 text-sm font-semibold">今日时间轴</h3><div className="space-y-1 border-l-2 pl-3">{data.sessions.map((session) => { const item = data.items.find((candidate) => candidate.id === session.workItemId); return <div key={session.id} className="text-xs"><span className="tabular-nums text-muted-foreground">{time(session.startedAt)}–{session.endedAt ? time(session.endedAt) : '现在'}</span><span className="ml-2 font-medium">{item?.title}</span>{session.endReason && <span className="ml-2 text-muted-foreground">{session.endReason}</span>}</div> })}</div>
      </div> : view === 'map' ? <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 md:grid-cols-3">{lanes.map((lane) => <div key={lane.title} className="rounded-lg border bg-muted/20 p-2"><h3 className="mb-2 text-xs font-semibold">{lane.title} · {lane.items.length}</h3><div className="space-y-2">{lane.items.map((todo) => { const parent = parentLabel(todo); return <button type="button" key={todo.id} onClick={() => selectTodo(todo)} className="block w-full rounded-md border bg-background p-2 text-left">{parent && <p className="mb-1 truncate text-[9px] font-medium text-violet-600">↳ {parent}</p>}<p className="text-xs font-medium">{todo.title}</p><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); void promote(todo.id) }} className="mt-2 inline-block text-[10px] font-medium text-primary">加入今天</span></button> })}</div></div>)}</div> : <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 md:grid-cols-2">{plans.map((plan) => { const offset = planHistoryOffsets[plan.id] ?? 0; const visibleWeek = shiftWeek(plan.weekStart, -offset); const visibleCheckIns = plan.checkIns.filter((checkIn) => checkIn.weekStart === visibleWeek); return <article key={plan.id} className="rounded-lg border bg-background p-4"><button type="button" onClick={() => setSelected({ title: plan.title, description: plan.description, plannedMinutes: plan.estimatedMinutes, meta: `本周 ${plan.cycleDone}/${plan.targetCount} 次` })} className="w-full text-left"><div className="flex justify-between gap-3"><p className="font-medium">{plan.title}</p><span className="text-xs font-semibold tabular-nums">{plan.cycleDone}/{plan.targetCount}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, plan.cycleDone / plan.targetCount * 100)}%` }} /></div></button><div className="mt-4 flex items-center justify-between gap-3"><div><p className="text-[9px] text-muted-foreground">每周目标</p><div className="mt-1 flex items-center gap-1"><button type="button" disabled={plan.targetCount <= 1 || updatingPlanId === plan.id} onClick={async () => { setUpdatingPlanId(plan.id); try { await onPlanTargetChange(plan.id, plan.targetCount - 1) } finally { setUpdatingPlanId(null) } }} className="rounded border p-1 disabled:opacity-30"><Minus className="size-3" /></button><span className="w-7 text-center text-xs font-medium tabular-nums">{plan.targetCount}</span><button type="button" disabled={updatingPlanId === plan.id} onClick={async () => { setUpdatingPlanId(plan.id); try { await onPlanTargetChange(plan.id, plan.targetCount + 1) } finally { setUpdatingPlanId(null) } }} className="rounded border p-1 disabled:opacity-30"><Plus className="size-3" /></button></div></div><Button disabled={updatingPlanId === plan.id} onClick={async () => { setUpdatingPlanId(plan.id); try { await onPlanCheckIn(plan.id) } finally { setUpdatingPlanId(null) } }}><Plus className="mr-1 size-4" />打卡 +1</Button></div><div className="mt-4 border-t pt-3"><div className="mb-2 flex items-center justify-between gap-2"><button type="button" disabled={offset >= 15} onClick={() => setPlanHistoryOffsets((value) => ({ ...value, [plan.id]: offset + 1 }))} className="text-[10px] text-primary disabled:opacity-30">← 较早</button><div className="text-center"><p className="text-[10px] font-medium">{visibleWeek}</p><p className="text-[9px] text-muted-foreground">{visibleCheckIns.length} 次 · {visibleCheckIns.length} 小时</p></div><button type="button" disabled={offset === 0} onClick={() => setPlanHistoryOffsets((value) => ({ ...value, [plan.id]: Math.max(0, offset - 1) }))} className="text-[10px] text-primary disabled:opacity-30">较新 →</button></div>{visibleCheckIns.length > 0 ? <div className="space-y-1.5">{visibleCheckIns.map((checkIn, index) => <div key={checkIn.id} className="flex items-center justify-between rounded bg-muted/60 px-2 py-1.5 text-[10px]"><span>打卡 #{visibleCheckIns.length - index}</span><span className="tabular-nums text-muted-foreground">{new Date(checkIn.checkedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 1 小时</span></div>)}</div> : <p className="py-3 text-center text-[10px] text-muted-foreground">本周暂无打卡</p>}</div></article> })}</div>}
    </section>
    <aside className="overflow-y-auto rounded-lg border bg-card p-3"><h2 className="text-sm font-semibold">任务详情</h2>{selected ? <div className="mt-3">{selectedParent && <button type="button" onClick={() => selectTodo(selectedParent)} className="mb-3 flex w-full items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-2 py-2 text-left text-xs text-violet-700"><CornerUpLeft className="size-3.5 shrink-0" /><span className="min-w-0"><span className="block text-[9px] text-violet-500">返回父任务</span><span className="block truncate font-medium">{selectedParent.title}</span></span></button>}<p className="font-medium">{selected.title}</p>{selected.meta && <p className="mt-1 text-[10px] text-muted-foreground">{selected.meta}</p>}<p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.description || '暂无描述'}</p><p className="mt-3 text-xs">预计 {selected.plannedMinutes} 分钟</p>{selectedTodo && <div className="mt-5 border-t pt-3"><div className="mb-2 flex items-center justify-between"><div><h3 className="text-xs font-semibold">子任务优先级</h3><p className="text-[9px] text-muted-foreground">越靠上越优先</p></div><span className="text-[10px] text-muted-foreground">{selectedChildren.length} 项</span></div>{selectedChildren.length > 0 ? <div className="space-y-1.5">{selectedChildren.map((child, index) => <div key={child.id} className="flex items-center gap-1 rounded-md border px-1.5 py-1.5"><span className="w-5 text-center text-[10px] font-medium tabular-nums text-muted-foreground">{index + 1}</span><button type="button" onClick={() => selectTodo(child)} className="min-w-0 flex-1 px-1 text-left"><span className="block truncate text-xs font-medium">{child.title}</span><span className="block text-[9px] text-muted-foreground">{child.status} · {child.estimatedMinutes} 分钟</span></button><div className="flex shrink-0"><button type="button" aria-label={`提高 ${child.title} 的优先级`} disabled={index === 0 || reordering} onClick={() => void moveChild(index, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"><ArrowUp className="size-3.5" /></button><button type="button" aria-label={`降低 ${child.title} 的优先级`} disabled={index === selectedChildren.length - 1 || reordering} onClick={() => void moveChild(index, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"><ArrowDown className="size-3.5" /></button></div><ChevronRight className="size-3.5 shrink-0 text-muted-foreground" /></div>)}</div> : <p className="text-[10px] text-muted-foreground">暂无子任务</p>}</div>}</div> : <p className="mt-3 text-xs text-muted-foreground">选择任务后在这里查看详情。</p>}</aside>
  </div>
}
