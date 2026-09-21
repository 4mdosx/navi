'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CornerUpLeft, Plus, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { isEditableNote, isNoteKind, isStatusChangeNote, TODO_STATUS_LABEL, type Todo, type TodoKind, type TodoStatus, type TodoTimeSpan } from '@/types/todo'
import type { TodayExecution } from '@/types/execution'
import { shiftWeekStart } from '@/backstage/week-plan/week-utils'
import { noteChildrenOf } from '@/lib/todo-outline'
import { formatWeekStartClient } from './week-plan-api'
import { WeekOutline } from './week-outline'
import { EstimatedMinutesControl, KindPicker, StatusGlyph, StatusPicker, STATUS_TOKEN } from './todo-status'
import { TimeProgressBackdrop } from './time-progress-backdrop'
import { WorkZone } from './work-zone'
import { WORKSPACE_DRAG_TYPE, hasWorkspaceDrag } from './todo-drag'

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
    <div className="relative z-10 flex min-w-0 items-center gap-1">
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
  const [, setData] = useState<TodayExecution>({ items: [], sessions: [] })
  const [selected, setSelected] = useState<Detail | null>(null)
  const [reordering, setReordering] = useState(false)
  const [spans, setSpans] = useState<TodoTimeSpan[]>([])
  const [now, setNow] = useState(() => Date.now())
  const load = useCallback(() => fetch('/api/execution/today').then((r) => r.json()).then((r) => setData(r.data)), [])
  const spanRange = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = new Date(Math.min(start.getTime(), today.getTime()))
    const weekEnd = new Date(start)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const to = new Date(Math.max(weekEnd.getTime(), Date.now()))
    return { from: from.toISOString(), to: to.toISOString() }
  }, [weekStart])
  const loadSpans = useCallback(() => {
    const query = new URLSearchParams(spanRange)
    return fetch(`/api/todo-time-spans?${query}`, { credentials: 'include' })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) throw new Error(result.error || '时间记录加载失败')
        setSpans(Array.isArray(result.data) ? result.data : [])
      })
      .catch(() => undefined)
  }, [spanRange])
  useEffect(() => { void load() }, [load])
  useEffect(() => { void loadSpans() }, [loadSpans])
  useEffect(() => {
    const hasOpen = spans.some((span) => span.endedAt == null)
    const timer = window.setInterval(() => setNow(Date.now()), hasOpen ? 1000 : 30_000)
    return () => window.clearInterval(timer)
  }, [spans])
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
  const handleTodosChanged = useCallback(() => {
    onTodosChanged()
    void loadSpans()
  }, [onTodosChanged, loadSpans])
  const promote = async (todoId: string) => {
    const response = await fetch('/api/execution/today', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'promote', todoId }) })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '加入今天失败')
    setData(result.data)
    onTodosChanged()
    onExecutionChanged()
  }
  const mutateWorkspace = async (todoId: string, action: 'enter' | 'leave') => {
    const query = new URLSearchParams(spanRange)
    const response = await fetch(`/api/todo-time-spans?${query}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, todoId }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || (action === 'enter' ? '进入工作区失败' : '移出工作区失败'))
    if (Array.isArray(result.data?.spans)) setSpans(result.data.spans)
    else void loadSpans()
    onTodosChanged()
    onExecutionChanged()
  }
  const enterWorkspace = (todoId: string) => { void mutateWorkspace(todoId, 'enter') }
  const leaveWorkspace = (todoId: string) => { void mutateWorkspace(todoId, 'leave') }
  const todoById = useMemo(() => new Map(todos.map((todo) => [todo.id, todo])), [todos])
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
  const selectTodo = (todo: Todo) => {
    const parent = parentLabel(todo)
    setSelected({
      title: todo.title,
      description: todo.description,
      plannedMinutes: todo.estimatedMinutes,
      meta: parent ? `属于：${parent}` : undefined,
      todoId: todo.id,
    })
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
        noteType: 'user',
        estimatedMinutes: 0,
      }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '备注添加失败')
    setNoteDraft('')
    onTodosChanged()
  }
  const updateNote = async (note: Todo, title: string) => {
    if (!isEditableNote(note)) return
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
  const deleteNote = async (note: Todo) => {
    if (!isEditableNote(note)) return
    const response = await fetch(`/api/todos/${encodeURIComponent(note.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '备注删除失败')
    onTodosChanged()
  }
  const patchTodo = async (todo: Todo, input: { status?: TodoStatus; kind?: TodoKind; estimatedMinutes?: number }) => {
    const response = await fetch(`/api/todos/${encodeURIComponent(todo.id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, version: todo.version }),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || '任务更新失败')
    handleTodosChanged()
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
  return <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <header className="relative flex shrink-0 items-center justify-between gap-3 overflow-hidden border-b px-3 py-2.5" aria-label="今天与本周时间进度">
        <TimeProgressBackdrop weekStart={weekStart} spans={spans} now={now} />
        <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />
        <div className="relative z-10 flex items-center gap-2">
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
          <Link
            href="/settings"
            aria-label="设置"
            title="设置"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </header>
      <WorkZone
        todos={todos}
        spans={spans}
        now={now}
        onEnter={enterWorkspace}
        onLeave={leaveWorkspace}
        onSelect={selectTodo}
      />
      {view === 'week' ? (
        <WeekOutline todos={todos} ready={todosReady} weekStart={weekStart} onTodosChanged={handleTodosChanged} onPromote={(todoId) => void promote(todoId)} onSelect={selectTodo} onOpenNotes={openNotes} onLeaveWorkspace={leaveWorkspace} />
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
          onDragOver={(event) => {
            if (!hasWorkspaceDrag(event)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(event) => {
            const todoId = event.dataTransfer.getData(WORKSPACE_DRAG_TYPE)
            if (!todoId) return
            event.preventDefault()
            leaveWorkspace(todoId)
          }}
        >
          <p className="text-sm font-medium">今天</p>
          <p className="mt-1 text-xs text-muted-foreground">执行视图待设计</p>
        </div>
      )}
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
          onDeleteNote={deleteNote}
          onPatchTodo={patchTodo}
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
  onDeleteNote,
  onPatchTodo,
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
  onDeleteNote: (note: Todo) => Promise<void>
  onPatchTodo: (todo: Todo, input: { status?: TodoStatus; kind?: TodoKind; estimatedMinutes?: number }) => Promise<void>
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
      {selectedTodo && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KindPicker kind={selectedTodo.kind} onChange={(kind) => void onPatchTodo(selectedTodo, { kind })} />
          <StatusPicker status={selectedTodo.status} onChange={(status) => void onPatchTodo(selectedTodo, { status })} />
        </div>
      )}
      {selected.meta && <p className="mt-2 text-[10px] text-muted-foreground">{selected.meta}</p>}
      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selected.description || '暂无描述'}</p>
      {selectedTodo && (
        <div className="mt-3">
          <EstimatedMinutesControl
            minutes={selectedTodo.estimatedMinutes}
            onChange={(estimatedMinutes) => void onPatchTodo(selectedTodo, { estimatedMinutes })}
          />
        </div>
      )}

      {selectedTodo && (
        <div className="mt-5 border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold">备注</h3>
              <p className="text-[9px] text-muted-foreground">用户备注可编辑；状态变更会自动留下一条不可改的记录</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{selectedNotes.length} 条</span>
          </div>
          {selectedNotes.length > 0 ? (
            <div className="space-y-2">
              {selectedNotes.map((note) => {
                const locked = isStatusChangeNote(note)
                return (
                <div key={note.id} className={cn('rounded-md border px-2 py-1.5', locked ? 'bg-muted/50' : 'bg-muted/30')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] tabular-nums text-muted-foreground">{formatNoteTime(note.createdAt)}</p>
                    {locked ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">状态变更</span>
                    ) : (
                      <button
                        type="button"
                        aria-label="删除备注"
                        onClick={() => void onDeleteNote(note)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                  {locked ? (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{note.title}</p>
                  ) : editingNoteId === note.id ? (
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
                )
              })}
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
                    <span className={cn('block truncate text-xs font-medium', STATUS_TOKEN[child.status].text, (child.status === 'done' || child.status === 'cancelled') && 'line-through opacity-70')}>{child.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                      <StatusGlyph status={child.status} className="size-3" />
                      {TODO_STATUS_LABEL[child.status]} · {child.estimatedMinutes} 分钟
                    </span>
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
