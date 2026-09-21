'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, CornerUpLeft, Pause, Play, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { isNoteKind, type Todo } from '@/types/todo'
import type { TodayExecution, WorkItem } from '@/types/execution'
import { shiftWeekStart } from '@/backstage/week-plan/week-utils'
import { noteChildrenOf } from '@/lib/todo-outline'
import { formatWeekStartClient } from './week-plan-api'
import { WeekOutline } from './week-outline'

const time = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

type ViewId = 'week' | 'today'
type Detail = { title: string; description: string; plannedMinutes: number; meta?: string; todoId?: string }

const VIEWS: { id: ViewId; label: string; shortcut: string }[] = [
  { id: 'week', label: '本周', shortcut: '1' },
  { id: 'today', label: '今天', shortcut: '2' },
]

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function WeekSwitcher({ weekStart, onChange }: { weekStart: string; onChange: (weekStart: string) => void }) {
  const currentWeek = formatWeekStartClient(new Date())
  const isCurrentWeek = weekStart === currentWeek
  return (
    <div className="flex min-w-0 items-center gap-1">
      <button type="button" onClick={() => onChange(shiftWeekStart(weekStart, -1))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="上一周">
        <ChevronLeft className="size-4" />
      </button>
      <p className="min-w-28 text-center text-xs font-medium tabular-nums">{weekStart} 起</p>
      <button type="button" onClick={() => onChange(shiftWeekStart(weekStart, 1))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="下一周">
        <ChevronRight className="size-4" />
      </button>
      {!isCurrentWeek && (
        <button type="button" onClick={() => onChange(currentWeek)} className="ml-1 text-[10px] text-primary hover:underline">回到本周</button>
      )}
    </div>
  )
}

export function TodayExecutionCenter({ todos, todosReady = true, onTodosChanged, onExecutionChanged }: { todos: Todo[]; todosReady?: boolean; onTodosChanged: () => void; onExecutionChanged: () => void }) {
  const [view, setView] = useState<ViewId>('week')
  const [weekStart, setWeekStart] = useState(() => formatWeekStartClient(new Date()))
  const [derivedTitle, setDerivedTitle] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [focusNotes, setFocusNotes] = useState(false)
  const [data, setData] = useState<TodayExecution>({ items: [], sessions: [] })
  const [selected, setSelected] = useState<Detail | null>(null)
  const [reordering, setReordering] = useState(false)
  const [transitions, setTransitions] = useState<Record<string, 'promote' | 'start' | 'pause' | 'remove' | 'complete'>>({})
  const load = useCallback(() => fetch('/api/execution/today').then((r) => r.json()).then((r) => setData(r.data)), [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isEditableTarget(event.target)) return
      const shortcut = event.code === 'Digit1' || event.code === 'Numpad1'
        ? '1'
        : event.code === 'Digit2' || event.code === 'Numpad2'
          ? '2'
          : null
      const next = VIEWS.find((item) => item.shortcut === shortcut)?.id
      if (!next) return
      event.preventDefault()
      setView(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const withTransition = async <T,>(key: string, transition: 'promote' | 'start' | 'pause' | 'remove' | 'complete', operation: () => Promise<T>) => {
    setTransitions((current) => ({ ...current, [key]: transition }))
    if (transition !== 'promote') await new Promise((resolve) => window.setTimeout(resolve, transition === 'remove' ? 220 : 150))
    try {
      return await operation()
    } finally {
      setTransitions((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }
  const executionAction = async (body: Record<string, string>) => {
    const response = await fetch('/api/execution/today', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '今日执行操作失败')
    setData(result.data)
    onTodosChanged()
    onExecutionChanged()
  }
  const action = (id: string, actionName: 'start' | 'pause' | 'complete' | 'remove') => withTransition(id, actionName, () => executionAction({ id, action: actionName }))
  const startTodo = (todoId: string) => withTransition(`todo-${todoId}`, 'start', () => executionAction({ todoId, action: 'startTodo' }))
  const promote = (todoId: string) => withTransition(`todo-${todoId}`, 'promote', async () => {
    const response = await fetch('/api/execution/today', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'promote', todoId }) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '加入今天失败')
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    setData(result.data)
    setView('today')
  })
  const active = data.items.find((item) => item.state === 'active')
  const todoById = useMemo(() => new Map(todos.map((todo) => [todo.id, todo])), [todos])
  const todayTodoIds = useMemo(() => new Set(data.items.filter((item) => item.sourceType === 'todo' && item.state !== 'skipped').map((item) => item.sourceId)), [data.items])
  const queue = data.items.filter((item) => {
    if (['active', 'done', 'skipped'].includes(item.state)) return false
    const todo = item.sourceType === 'todo' ? todoById.get(item.sourceId) : null
    return !todo?.parentId || !todayTodoIds.has(todo.parentId)
  })
  const childrenByParentId = useMemo(() => {
    const grouped = new Map<string, Todo[]>()
    for (const todo of todos) {
      if (!todo.parentId || isNoteKind(todo.kind)) continue
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
  const selectedNotes = selectedTodo ? noteChildrenOf(todos, selectedTodo.id) : []
  const addDerived = async () => {
    if (!selectedTodo || !derivedTitle.trim()) return
    const response = await fetch('/api/todos', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: derivedTitle.trim(),
        parentId: selectedTodo.id,
        kind: 'action',
        estimatedMinutes: 0,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '子任务创建失败')
    setDerivedTitle('')
    onTodosChanged()
  }
  const addNote = async () => {
    if (!selectedTodo || !noteDraft.trim()) return
    const response = await fetch('/api/todos', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: noteDraft.trim(),
        parentId: selectedTodo.id,
        kind: 'note',
        estimatedMinutes: 0,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '备注添加失败')
    setNoteDraft('')
    onTodosChanged()
  }
  const updateNote = async (note: Todo, title: string) => {
    const nextTitle = title.trim()
    setEditingNoteId(null)
    if (!nextTitle || nextTitle === note.title) return
    const response = await fetch(`/api/todos/${encodeURIComponent(note.id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: nextTitle, version: note.version }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '备注更新失败')
    onTodosChanged()
  }
  const openNotes = (todo: Todo) => {
    selectTodo(todo)
    setFocusNotes(true)
  }
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
  const todaySubtasks = (item: WorkItem) => {
    if (item.sourceType !== 'todo') return null
    const children = childrenByParentId.get(item.sourceId) ?? []
    if (children.length === 0) return null
    return <div className="mt-3 animate-in border-t pt-2 duration-300 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"><p className="mb-1.5 text-[9px] font-medium text-muted-foreground">子任务进度 · {children.filter((child) => child.status === 'done').length}/{children.length}</p><div className="space-y-1">{children.map((child) => { const workItem = data.items.find((candidate) => candidate.sourceType === 'todo' && candidate.sourceId === child.id && candidate.state !== 'skipped'); const state = workItem?.state ?? child.status; const done = child.status === 'done' || workItem?.state === 'done'; const running = workItem?.state === 'active'; const starting = transitions[`todo-${child.id}`] === 'start'; return <div key={child.id} className={`flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 transition-all duration-200 motion-reduce:transition-none ${starting ? 'translate-x-1 bg-sky-50 opacity-60' : ''}`}><span className={`size-2 shrink-0 rounded-full transition-colors duration-300 ${done ? 'bg-emerald-500' : running || starting ? 'bg-sky-500' : 'bg-muted-foreground/30'}`} /><button type="button" onClick={() => selectTodo(child, state)} className="min-w-0 flex-1 text-left"><span className={`block truncate text-[10px] font-medium ${done ? 'line-through opacity-60' : ''}`}>{child.title}</span><span className="block text-[9px] text-muted-foreground">{done ? '已完成' : running ? '进行中' : starting ? '正在切换…' : state === 'paused' ? '已暂停' : '待开始'} · {child.estimatedMinutes} 分钟</span></button><Button size="sm" variant="outline" disabled={done || running || starting} onClick={() => void startTodo(child.id)} className="h-6 px-2 text-[9px] transition-transform active:scale-90 motion-reduce:transition-none"><Play className="mr-1 size-2.5" />{starting ? '切换中' : workItem?.state === 'paused' ? '继续' : '进行'}</Button></div> })}</div></div>
  }
  return <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2">
        <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />
        <div className="rounded-md bg-muted p-1">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-keyshortcuts={`Meta+${item.shortcut}`}
              title={`⌘${item.shortcut}`}
              className={cn('rounded px-3 py-1 text-xs', view === item.id && 'bg-background shadow')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      {view === 'week' ? <WeekOutline todos={todos} ready={todosReady} weekStart={weekStart} onTodosChanged={onTodosChanged} onPromote={(todoId) => void promote(todoId)} onSelect={selectTodo} onOpenNotes={openNotes} /> : <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {active ? <div className={`mb-3 animate-in rounded-lg border border-sky-400 bg-sky-50/50 p-4 duration-300 fade-in-0 slide-in-from-top-2 motion-reduce:animate-none motion-reduce:transition-none ${transitions[active.id] === 'pause' ? '-translate-y-1 opacity-0 transition-all duration-150' : transitions[active.id] === 'remove' ? '-translate-x-6 opacity-0 transition-all duration-200' : ''}`}><p className="text-xs text-sky-700">正在执行</p><button onClick={() => selectWorkItem(active)} className="mt-1 text-left text-lg font-semibold">{active.title}</button><div className="mt-3 flex flex-wrap gap-2"><Button disabled={Boolean(transitions[active.id])} onClick={() => void action(active.id, 'pause')} variant="outline" className="transition-transform active:scale-95 motion-reduce:transition-none"><Pause className={`mr-1 size-4 ${transitions[active.id] === 'pause' ? 'animate-pulse' : ''}`} />{transitions[active.id] === 'pause' ? '暂停中…' : '暂停'}</Button><Button disabled={Boolean(transitions[active.id])} onClick={() => void action(active.id, 'complete')} className="transition-transform active:scale-95 motion-reduce:transition-none"><Check className="mr-1 size-4" />完成</Button><Button disabled={Boolean(transitions[active.id])} onClick={() => void action(active.id, 'remove')} variant="ghost" className="text-muted-foreground transition-transform active:scale-95 motion-reduce:transition-none">{transitions[active.id] === 'remove' ? '移出中…' : '移出今天'}</Button></div>{todaySubtasks(active)}</div> : <div className="mb-3 animate-in rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground duration-300 fade-in-0 motion-reduce:animate-none">尚未开始任务</div>}
        <h3 className="mb-2 text-sm font-semibold">今日队列</h3><div className="space-y-2">{queue.map((item, index) => { const transition = transitions[item.id]; return <div key={item.id} className={`animate-in rounded-lg border p-3 duration-300 fade-in-0 slide-in-from-bottom-2 transition-all ease-out motion-reduce:animate-none motion-reduce:transition-none ${transition === 'start' ? 'translate-x-3 border-sky-300 bg-sky-50/60 opacity-0' : transition === 'remove' ? '-translate-x-6 opacity-0' : ''}`}><div className="flex items-center gap-3"><span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span><button onClick={() => selectWorkItem(item)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-[10px] text-muted-foreground">{item.plannedMinutes} 分钟 · {item.priority}</p></button><Button size="sm" variant="outline" disabled={Boolean(transition)} onClick={() => void action(item.id, 'start')} className="transition-transform active:scale-90 motion-reduce:transition-none"><Play className={`mr-1 size-3 ${transition === 'start' ? 'animate-pulse' : ''}`} />{transition === 'start' ? '启动中' : '开始'}</Button><Button size="sm" variant="ghost" disabled={Boolean(transition)} onClick={() => void action(item.id, 'remove')} className="text-muted-foreground transition-transform active:scale-90 motion-reduce:transition-none">{transition === 'remove' ? '移出中' : '移出'}</Button></div>{todaySubtasks(item)}</div> })}</div>
        <h3 className="mb-2 mt-5 text-sm font-semibold">今日时间轴</h3><div className="space-y-1 border-l-2 pl-3">{data.sessions.map((session) => { const item = data.items.find((candidate) => candidate.id === session.workItemId); return <div key={session.id} className="text-xs"><span className="tabular-nums text-muted-foreground">{time(session.startedAt)}–{session.endedAt ? time(session.endedAt) : '现在'}</span><span className="ml-2 font-medium">{item?.title}</span>{session.endReason && <span className="ml-2 text-muted-foreground">{session.endReason}</span>}</div> })}</div>
      </div>}
    </section>
    <aside className="overflow-y-auto rounded-lg border bg-card p-3">
      <h2 className="text-sm font-semibold">任务详情</h2>
      {selected ? (
        <TaskDetailPanel
          selected={selected}
          selectedTodo={selectedTodo}
          selectedParent={selectedParent}
          selectedChildren={selectedChildren}
          selectedNotes={selectedNotes}
          derivedTitle={derivedTitle}
          noteDraft={noteDraft}
          editingNoteId={editingNoteId}
          editingNoteText={editingNoteText}
          reordering={reordering}
          focusNotes={focusNotes}
          onSelectTodo={selectTodo}
          onDerivedTitle={setDerivedTitle}
          onNoteDraft={setNoteDraft}
          onEditingNoteId={setEditingNoteId}
          onEditingNoteText={setEditingNoteText}
          onFocusNotesHandled={() => setFocusNotes(false)}
          onMoveChild={moveChild}
          onAddDerived={addDerived}
          onAddNote={addNote}
          onUpdateNote={updateNote}
        />
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">选择任务后在这里查看详情。</p>
      )}
    </aside>
  </div>
}

function formatNoteTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskDetailPanel({
  selected,
  selectedTodo,
  selectedParent,
  selectedChildren,
  selectedNotes,
  derivedTitle,
  noteDraft,
  editingNoteId,
  editingNoteText,
  reordering,
  focusNotes,
  onSelectTodo,
  onDerivedTitle,
  onNoteDraft,
  onEditingNoteId,
  onEditingNoteText,
  onFocusNotesHandled,
  onMoveChild,
  onAddDerived,
  onAddNote,
  onUpdateNote,
}: {
  selected: Detail
  selectedTodo: Todo | null | undefined
  selectedParent: Todo | null | undefined
  selectedChildren: Todo[]
  selectedNotes: Todo[]
  derivedTitle: string
  noteDraft: string
  editingNoteId: string | null
  editingNoteText: string
  reordering: boolean
  focusNotes: boolean
  onSelectTodo: (todo: Todo) => void
  onDerivedTitle: (value: string) => void
  onNoteDraft: (value: string) => void
  onEditingNoteId: (id: string | null) => void
  onEditingNoteText: (value: string) => void
  onFocusNotesHandled: () => void
  onMoveChild: (index: number, direction: -1 | 1) => Promise<void>
  onAddDerived: () => Promise<void>
  onAddNote: () => Promise<void>
  onUpdateNote: (note: Todo, title: string) => Promise<void>
}) {
  const noteInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!focusNotes) return
    noteInputRef.current?.focus()
    onFocusNotesHandled()
  }, [focusNotes, onFocusNotesHandled])

  useEffect(() => {
    onNoteDraft('')
    onEditingNoteId(null)
    onEditingNoteText('')
  }, [selected.todoId, onNoteDraft, onEditingNoteId, onEditingNoteText])

  return (
    <div className="mt-3">
      {selectedParent && (
        <button
          type="button"
          onClick={() => onSelectTodo(selectedParent)}
          className="mb-3 flex w-full items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-2 py-2 text-left text-xs text-violet-700"
        >
          <CornerUpLeft className="size-3.5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[9px] text-violet-500">返回父任务</span>
            <span className="block truncate font-medium">{selectedParent.title}</span>
          </span>
        </button>
      )}
      <p className="font-medium">{selected.title}</p>
      {selected.meta && <p className="mt-1 text-[10px] text-muted-foreground">{selected.meta}</p>}
      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.description || '暂无描述'}</p>
      {selected.plannedMinutes > 0 && <p className="mt-3 text-xs">预计 {selected.plannedMinutes} 分钟</p>}

      {selectedTodo && (
        <div className="mt-5 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold">备注</h3>
              <p className="text-[9px] text-muted-foreground">按时间追加，不出现在任务主视图</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{selectedNotes.length} 条</span>
          </div>
          {selectedNotes.length > 0 ? (
            <div className="space-y-2">
              {selectedNotes.map((note) => (
                <div key={note.id} className="rounded-md border bg-muted/30 px-2 py-1.5">
                  <p className="text-[9px] tabular-nums text-muted-foreground">{formatNoteTime(note.createdAt)}</p>
                  {editingNoteId === note.id ? (
                    <Input
                      value={editingNoteText}
                      onChange={(event) => onEditingNoteText(event.target.value)}
                      onBlur={() => void onUpdateNote(note, editingNoteText)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void onUpdateNote(note, editingNoteText)
                        }
                        if (event.key === 'Escape') onEditingNoteId(null)
                      }}
                      className="mt-1 h-7 text-xs"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onEditingNoteId(note.id)
                        onEditingNoteText(note.title)
                      }}
                      className="mt-1 w-full whitespace-pre-wrap text-left text-xs leading-5"
                    >
                      {note.title}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">暂无备注</p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void onAddNote()
            }}
            className="mt-2 grid gap-1.5"
          >
            <Textarea
              ref={noteInputRef}
              value={noteDraft}
              onChange={(event) => onNoteDraft(event.target.value)}
              placeholder="追加一条备注"
              rows={2}
              className="min-h-16 text-xs"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" className="h-7 px-2 text-[10px]" disabled={!noteDraft.trim()}>
                追加备注
              </Button>
            </div>
          </form>
        </div>
      )}

      {selectedTodo && (
        <div className="mt-5 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold">子任务优先级</h3>
              <p className="text-[9px] text-muted-foreground">越靠上越优先</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{selectedChildren.length} 项</span>
          </div>
          {selectedChildren.length > 0 ? (
            <div className="space-y-1.5">
              {selectedChildren.map((child, index) => (
                <div key={child.id} className="flex items-center gap-1 rounded-md border px-1.5 py-1.5">
                  <span className="w-5 text-center text-[10px] font-medium tabular-nums text-muted-foreground">{index + 1}</span>
                  <button type="button" onClick={() => onSelectTodo(child)} className="min-w-0 flex-1 px-1 text-left">
                    <span className="block truncate text-xs font-medium">{child.title}</span>
                    <span className="block text-[9px] text-muted-foreground">{child.status} · {child.estimatedMinutes} 分钟</span>
                  </button>
                  <div className="flex shrink-0">
                    <button type="button" aria-label={`提高 ${child.title} 的优先级`} disabled={index === 0 || reordering} onClick={() => void onMoveChild(index, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" aria-label={`降低 ${child.title} 的优先级`} disabled={index === selectedChildren.length - 1 || reordering} onClick={() => void onMoveChild(index, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25">
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">暂无子任务</p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void onAddDerived()
            }}
            className="mt-3 flex gap-1"
          >
            <Input value={derivedTitle} onChange={(event) => onDerivedTitle(event.target.value)} placeholder="衍生子任务，挂在这条下面" className="h-7 text-xs" />
            <Button type="submit" size="sm" className="h-7 px-2 text-[10px]" disabled={!derivedTitle.trim()}>挂上</Button>
          </form>
        </div>
      )}
    </div>
  )
}
