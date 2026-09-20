'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  buildOutlineTree,
  countOutlineProgress,
  hasDescendantTasks,
  outlineRole,
  parseOutline,
  selectTimeOutline,
  type OutlineTreeNode,
} from '@/lib/todo-outline'
import { formatWeekStartClient } from './week-plan-api'
import { formatDateKey, shiftWeekStart } from '@/backstage/week-plan/week-utils'
import { hasTimeLink, isCheckableKind, type TimeGrain, type Todo, type TodoKind } from '@/types/todo'

type Adding = { parentId: string | null; kind: TodoKind }

export function WeekOutline({
  todos,
  ready = true,
  timeGrain = 'week',
  onTodosChanged,
  onPromote,
  onPinHorizon,
  onSelect,
}: {
  todos: Todo[]
  ready?: boolean
  timeGrain?: TimeGrain
  onTodosChanged: () => void
  onPromote?: (todoId: string) => void
  onPinHorizon?: (todoId: string) => void
  onSelect?: (todo: Todo) => void
}) {
  const [weekStart, setWeekStart] = useState(() => formatWeekStartClient(new Date()))
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [adding, setAdding] = useState<Adding | null>(null)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentWeek = formatWeekStartClient(new Date())
  const todayKey = formatDateKey(new Date())
  const isCurrentWeek = weekStart === currentWeek
  const anchorDate = timeGrain === 'week' ? weekStart : todayKey
  const visible = useMemo(
    () => selectTimeOutline(todos ?? [], timeGrain, anchorDate),
    [todos, timeGrain, anchorDate],
  )
  const tree = useMemo(() => buildOutlineTree(visible), [visible])
  const preview = useMemo(() => parseOutline(pasteText), [pasteText])

  const request = async (url: string, init: RequestInit) => {
    const response = await fetch(url, { credentials: 'include', ...init })
    const result = await response.json()
    if (!response.ok || result.success === false) throw new Error(result.error || '保存失败')
    return result
  }

  const createNode = async (input: { title: string; parentId: string | null; kind: TodoKind }) => {
    const title = input.title.trim()
    if (!title) return
    setSaving(true)
    setError(null)
    try {
      await request('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          parentId: input.parentId,
          kind: input.kind,
          status: 'pending',
          time: [{ grain: timeGrain, date: anchorDate }],
          estimatedMinutes: 0,
        }),
      })
      setAdding(null)
      setDraft('')
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const saveTitle = async (todo: Todo) => {
    const title = editTitle.trim()
    setEditingId(null)
    if (!title || title === todo.title) return
    try {
      await request(`/api/todos/${encodeURIComponent(todo.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, version: todo.version }),
      })
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '标题保存失败')
    }
  }

  const toggleDone = async (todo: OutlineTreeNode) => {
    if (!isCheckableKind(todo.kind) || hasDescendantTasks(todo)) return
    try {
      await request(`/api/todos/${encodeURIComponent(todo.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: todo.status === 'done' ? 'pending' : 'done',
          version: todo.version,
        }),
      })
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '状态更新失败')
    }
  }

  const importPaste = async () => {
    if (!pasteText.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await request('/api/todos/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pasteText,
          time: [{ grain: timeGrain, date: anchorDate }],
        }),
      })
      setPasteText('')
      setPasteOpen(false)
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleCollapse = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startAdd = (parentId: string | null, kind: TodoKind) => {
    setAdding({ parentId, kind })
    setDraft('')
    if (parentId) {
      setCollapsed((current) => {
        const next = new Set(current)
        next.delete(parentId)
        return next
      })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        {timeGrain === 'week' ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWeekStart(shiftWeekStart(weekStart, -1))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="上一周">
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-36 text-center">
              <p className="text-xs font-medium">{weekStart} 起</p>
              <p className="text-[10px] text-muted-foreground">{isCurrentWeek ? '本周时间视图' : '历史周视图，任务本身不挂在某一周下面'}</p>
            </div>
            <button type="button" onClick={() => setWeekStart(shiftWeekStart(weekStart, 1))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="下一周">
              <ChevronRight className="size-4" />
            </button>
            {!isCurrentWeek && (
              <button type="button" onClick={() => setWeekStart(currentWeek)} className="ml-1 text-[10px] text-primary hover:underline">回到本周</button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium">长期时间视图</p>
            <p className="text-[10px] text-muted-foreground">同一批任务，只看关联到长期的条目</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => startAdd(null, 'outcome')}>主题</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => startAdd(null, 'action')}>任务</Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => startAdd(null, 'note')}>备注</Button>
          <Button type="button" size="sm" variant={pasteOpen ? 'default' : 'outline'} className="h-7 px-2 text-[11px]" onClick={() => setPasteOpen((open) => !open)}>粘贴笔记</Button>
        </div>
      </div>

      {pasteOpen && (
        <div className="shrink-0 border-b bg-muted/20 p-3">
          <p className="mb-2 text-[11px] text-muted-foreground">按你平时写周计划的方式粘贴：主题做分组，`-` 是任务，☑️ 表示完成，缩进会变成子项。</p>
          <Textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={8} placeholder={'踢一脚\n- VPN 问题☑️\n- 平台接口\n  - 还未验证测试'} className="font-mono text-xs" />
          {preview.length > 0 && <p className="mt-2 text-[10px] text-muted-foreground">将导入 {countDrafts(preview)} 条</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>取消</Button>
            <Button type="button" size="sm" disabled={saving || preview.length === 0} onClick={() => void importPaste()}>{saving ? '导入中…' : timeGrain === 'horizon' ? '导入到长期' : '导入到本周'}</Button>
          </div>
        </div>
      )}

      {error && <p className="shrink-0 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!ready ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">加载本周大纲…</div>
        ) : tree.length === 0 && !adding && !pasteOpen ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center">
            <p className="text-sm font-medium">{timeGrain === 'horizon' ? '还没有长期关联的任务' : '本周还没有大纲'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{timeGrain === 'horizon' ? '在这里添加，或从本周把任务关联到长期。' : '粘贴笔记，或先加一个主题（例如发货、雅虎U9）。'}</p>
            <Button type="button" size="sm" className="mt-3" onClick={() => setPasteOpen(true)}>粘贴本周笔记</Button>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <OutlineRow
                key={node.id}
                node={node}
                collapsed={collapsed}
                editingId={editingId}
                editTitle={editTitle}
                adding={adding}
                draft={draft}
                saving={saving}
                onToggleCollapse={toggleCollapse}
                onToggleDone={toggleDone}
                onStartEdit={(todo) => { setEditingId(todo.id); setEditTitle(todo.title) }}
                onEditTitle={setEditTitle}
                onSaveTitle={saveTitle}
                onStartAdd={startAdd}
                onDraft={setDraft}
                onSubmitAdd={() => adding && void createNode({ title: draft, parentId: adding.parentId, kind: adding.kind })}
                onCancelAdd={() => { setAdding(null); setDraft('') }}
                onPromote={onPromote}
                onPinHorizon={onPinHorizon}
                onSelect={onSelect}
              />
            ))}
            {adding && adding.parentId == null && (
              <AddRow kind={adding.kind} value={draft} saving={saving} onChange={setDraft} onSubmit={() => void createNode({ title: draft, parentId: null, kind: adding.kind })} onCancel={() => { setAdding(null); setDraft('') }} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function countDrafts(nodes: ReturnType<typeof parseOutline>): number {
  return nodes.reduce((sum, node) => sum + 1 + countDrafts(node.children), 0)
}

function OutlineRow({
  node,
  collapsed,
  editingId,
  editTitle,
  adding,
  draft,
  saving,
  onToggleCollapse,
  onToggleDone,
  onStartEdit,
  onEditTitle,
  onSaveTitle,
  onStartAdd,
  onDraft,
  onSubmitAdd,
  onCancelAdd,
  onPromote,
  onPinHorizon,
  onSelect,
}: {
  node: OutlineTreeNode
  collapsed: Set<string>
  editingId: string | null
  editTitle: string
  adding: Adding | null
  draft: string
  saving: boolean
  onToggleCollapse: (id: string) => void
  onToggleDone: (todo: OutlineTreeNode) => void
  onStartEdit: (todo: Todo) => void
  onEditTitle: (title: string) => void
  onSaveTitle: (todo: Todo) => void
  onStartAdd: (parentId: string | null, kind: TodoKind) => void
  onDraft: (value: string) => void
  onSubmitAdd: () => void
  onCancelAdd: () => void
  onPromote?: (todoId: string) => void
  onPinHorizon?: (todoId: string) => void
  onSelect?: (todo: Todo) => void
}) {
  const role = outlineRole(node)
  const hasChildren = node.children.length > 0
  const grouped = hasDescendantTasks(node)
  const canCheck = role === 'task' && !grouped
  const isCollapsed = collapsed.has(node.id)
  const progress = countOutlineProgress(node)
  const done = node.status === 'done'
  const addingHere = adding?.parentId === node.id

  return (
    <div>
      <div className={cn('group flex items-start gap-1 rounded-md px-1 py-1 hover:bg-muted/50', (role === 'theme' || grouped) && 'mt-2 first:mt-0')}>
        {hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleCollapse(node.id)
            }}
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={isCollapsed ? '展开' : '收起'}
          >
            <ChevronDown className={cn('size-3.5 transition-transform', isCollapsed && '-rotate-90')} />
          </button>
        ) : (
          <span className="mt-0.5 size-6 shrink-0" />
        )}
        {canCheck ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggleDone(node)
            }}
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:text-emerald-600"
            aria-label={done ? '标为未完成' : '标为完成'}
          >
            {done ? <Check className="size-4 text-emerald-600" /> : <Circle className="size-4" />}
          </button>
        ) : (
          <span className="mt-0.5 size-6 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {editingId === node.id ? (
            <Input
              value={editTitle}
              onChange={(event) => onEditTitle(event.target.value)}
              onBlur={() => onSaveTitle(node)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSaveTitle(node)
                }
                if (event.key === 'Escape') onStartEdit(node)
              }}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSelect?.(node)
              }}
              onDoubleClick={(event) => {
                event.stopPropagation()
                onStartEdit(node)
              }}
              className={cn(
                'block w-full text-left',
                (role === 'theme' || grouped) && 'text-sm font-semibold',
                role === 'task' && !grouped && 'text-sm',
                role === 'note' && 'text-xs text-muted-foreground',
                done && canCheck && 'text-muted-foreground line-through',
              )}
            >
              {node.title}
            </button>
          )}
          {(role === 'theme' || grouped) && progress.total > 0 && (
            <p className="text-[10px] tabular-nums text-muted-foreground">{progress.done}/{progress.total} 完成</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {role !== 'note' && (
            <button type="button" onClick={() => onStartAdd(node.id, 'action')} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground" title="挂一个衍生任务">
              <Plus className="mr-0.5 inline size-3" />子任务
            </button>
          )}
          {role === 'task' && (
            <button type="button" onClick={() => onStartAdd(node.id, 'note')} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground">备注</button>
          )}
          {onPromote && role === 'task' && !done && (
            <button type="button" onClick={() => onPromote(node.id)} className="rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10">加入今天</button>
          )}
          {onPinHorizon && !hasTimeLink(node, 'horizon') && (
            <button type="button" onClick={() => onPinHorizon(node.id)} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground">长期</button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="ml-5 border-l border-dashed pl-2">
          {node.children.map((child) => (
            <OutlineRow
              key={child.id}
              node={child}
              collapsed={collapsed}
              editingId={editingId}
              editTitle={editTitle}
              adding={adding}
              draft={draft}
              saving={saving}
              onToggleCollapse={onToggleCollapse}
              onToggleDone={onToggleDone}
              onStartEdit={onStartEdit}
              onEditTitle={onEditTitle}
              onSaveTitle={onSaveTitle}
              onStartAdd={onStartAdd}
              onDraft={onDraft}
              onSubmitAdd={onSubmitAdd}
              onCancelAdd={onCancelAdd}
              onPromote={onPromote}
              onPinHorizon={onPinHorizon}
              onSelect={onSelect}
            />
          ))}
          {addingHere && (
            <AddRow kind={adding.kind} value={draft} saving={saving} onChange={onDraft} onSubmit={onSubmitAdd} onCancel={onCancelAdd} />
          )}
        </div>
      )}
    </div>
  )
}

function AddRow({
  kind,
  value,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  kind: TodoKind
  value: string
  saving: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const label = kind === 'note' ? '备注' : kind === 'action' ? '任务' : '主题'
  return (
    <form
      className="flex items-center gap-2 py-1 pl-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
        }}
        placeholder={`新的${label}`}
        className="h-7 text-sm"
        autoFocus
      />
      <Button type="submit" size="sm" className="h-7 px-2 text-[11px]" disabled={saving || !value.trim()}>添加</Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onCancel}>取消</Button>
    </form>
  )
}
