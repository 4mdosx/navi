'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, GripVertical, MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  buildOutlineTree,
  countOutlineProgress,
  filterOutlineByFocusMode,
  filterOutlineByStatuses,
  outlineRole,
  outlineTaskChildren,
  selectTimeOutline,
  siblingTasks,
  todayOperableIds,
  todayScheduledIds,
  wouldCreateCycle,
  type OutlineTreeNode,
} from '@/lib/todo-outline'
import { formatDateKey, formatWeekStart } from '@/backstage/week-plan/week-utils'
import {
  isNoteKind,
  todayDelayDays,
  TODO_STATUSES,
  type TimeGrain,
  type Todo,
  type TodoKind,
  type TodoStatus,
} from '@/types/todo'
import { StatusFilterButton, StatusGlyph, StatusPicker } from './todo-status'
import { FocusModeTool, TagManagerButton } from './todo-tags'
import { MobileAction, MobileActionSheet } from './mobile-chrome'
import { usePhoneLayout } from './use-phone-layout'
import { useTagWorkspace } from './tag-workspace'
import { OUTLINE_DRAG_TYPE, hasWorkspaceDrag, WORKSPACE_DRAG_TYPE } from './todo-drag'

type Adding = { parentId: string | null; kind: TodoKind }
type DropPosition = 'before' | 'after' | 'into'
type DropTarget = { id: string; position: DropPosition }

function dropPositionFromEvent(event: React.DragEvent<HTMLElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1)
  if (ratio < 0.28) return 'before'
  if (ratio > 0.72) return 'after'
  return 'into'
}

function useCommandPressed() {
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.key === 'Meta') setPressed(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'MetaLeft' || event.key === 'MetaRight') {
        setPressed(false)
      }
    }
    const onPointer = (event: PointerEvent) => setPressed(event.metaKey)
    const reset = () => setPressed(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
    }
  }, [])

  return pressed
}

export function WeekOutline({
  todos,
  ready = true,
  timeGrain = 'week',
  weekStart,
  onTodosChanged,
  onPromote,
  onRemoveFromToday,
  onSelect,
  onOpenNotes,
  onEnterWorkspace,
  onLeaveWorkspace,
  selectedId,
  workspaceTodoIds,
}: {
  todos: Todo[]
  ready?: boolean
  timeGrain?: TimeGrain
  weekStart: string
  onTodosChanged: () => void
  onPromote?: (todoId: string) => void
  onRemoveFromToday?: (todoId: string) => void
  onSelect?: (todo: Todo) => void
  onOpenNotes?: (todo: Todo) => void
  onEnterWorkspace?: (todoId: string) => void
  onLeaveWorkspace?: (todoId: string) => void
  selectedId?: string | null
  workspaceTodoIds?: ReadonlySet<string>
}) {
  const [adding, setAdding] = useState<Adding | null>(null)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [statusFilter, setStatusFilter] = useState<Set<TodoStatus>>(() => new Set(TODO_STATUSES))
  const [menuId, setMenuId] = useState<string | null>(null)
  const phone = usePhoneLayout()
  const { activeFocusMode } = useTagWorkspace()
  const commandPressed = useCommandPressed()
  const todayKey = formatDateKey(new Date())
  const resolvedWeekStart = weekStart || formatWeekStart(new Date())
  const anchorDate = timeGrain === 'week' ? resolvedWeekStart : todayKey
  const isTodayView = timeGrain === 'day'
  const weekTodos = useMemo(
    () => selectTimeOutline(todos ?? [], timeGrain, anchorDate),
    [todos, timeGrain, anchorDate],
  )
  const scheduledIds = useMemo(() => todayScheduledIds(todos ?? [], todayKey), [todos, todayKey])
  const operableIds = useMemo(
    () => (isTodayView ? todayOperableIds(weekTodos, scheduledIds) : null),
    [isTodayView, weekTodos, scheduledIds],
  )
  const visible = useMemo(
    () => filterOutlineByFocusMode(filterOutlineByStatuses(weekTodos, statusFilter), activeFocusMode),
    [weekTodos, statusFilter, activeFocusMode],
  )
  const tree = useMemo(() => buildOutlineTree(visible), [visible])

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

  const changeStatus = async (todo: OutlineTreeNode, status: TodoStatus) => {
    if (isNoteKind(todo.kind) || todo.status === status) return
    try {
      await request(`/api/todos/${encodeURIComponent(todo.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          version: todo.version,
        }),
      })
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '状态更新失败')
    }
  }

  const deleteNode = async (todo: Todo) => {
    if (saving || isNoteKind(todo.kind)) return
    setSaving(true)
    setError(null)
    try {
      await request(`/api/todos/${encodeURIComponent(todo.id)}?cascade=true`, { method: 'DELETE' })
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setSaving(false)
    }
  }

  const patchSortOrder = (id: string, sortOrder: number) =>
    request(`/api/todos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sortOrder }),
    })

  const moveNode = async (sourceId: string, target: DropTarget) => {
    if (saving || sourceId === target.id) return
    const source = visible.find((todo) => todo.id === sourceId)
    if (!source) return
    const targetTodo = visible.find((todo) => todo.id === target.id)
    if (!targetTodo) return

    const newParentId = target.position === 'into' ? targetTodo.id : targetTodo.parentId
    if (wouldCreateCycle(visible, sourceId, newParentId)) return

    const siblings = siblingTasks(visible, newParentId, sourceId)
    const targetIndex = siblings.findIndex((todo) => todo.id === target.id)
    const insertIndex = target.position === 'into'
      ? siblings.length
      : targetIndex < 0
        ? siblings.length
        : target.position === 'before'
          ? targetIndex
          : targetIndex + 1
    const nextSiblings = [...siblings]
    nextSiblings.splice(insertIndex, 0, source)

    const currentSiblings = siblingTasks(visible, source.parentId)
    const currentIndex = currentSiblings.findIndex((todo) => todo.id === sourceId)
    const sameParent = (source.parentId ?? null) === (newParentId ?? null)
    if (sameParent && currentIndex === insertIndex) return

    setSaving(true)
    setError(null)
    try {
      if (!sameParent) {
        await request(`/api/todos/${encodeURIComponent(sourceId)}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: newParentId, sortOrder: insertIndex, version: source.version }),
        })
        const oldSiblings = siblingTasks(visible, source.parentId, sourceId)
        await Promise.all([
          ...nextSiblings.map((todo, index) => (
            todo.id === sourceId ? Promise.resolve() : patchSortOrder(todo.id, index)
          )),
          ...oldSiblings.map((todo, index) => patchSortOrder(todo.id, index)),
        ])
      } else {
        await Promise.all(nextSiblings.map((todo, index) => patchSortOrder(todo.id, index)))
      }
      if (target.position === 'into') {
        setCollapsed((current) => {
          const next = new Set(current)
          next.delete(target.id)
          return next
        })
      }
      onTodosChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '拖拽调整失败')
    } finally {
      setSaving(false)
    }
  }

  const nudgeNode = (id: string, direction: -1 | 1) => {
    const source = visible.find((todo) => todo.id === id)
    if (!source) return
    const siblings = siblingTasks(visible, source.parentId)
    const index = siblings.findIndex((todo) => todo.id === id)
    const neighbor = siblings[index + direction]
    if (!neighbor) return
    void moveNode(id, { id: neighbor.id, position: direction < 0 ? 'before' : 'after' })
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
    if (kind === 'note') return
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

  const clearDrag = () => {
    setDraggingId(null)
    setDropTarget(null)
  }

  const addingRoot = adding?.parentId == null
  const rootTasks = tree.filter((node) => outlineRole(node) === 'task')
  const blockedDropIds = useMemo(() => {
    if (!draggingId) return new Set<string>()
    const ids = new Set<string>([draggingId])
    const addDescendants = (parentId: string) => {
      for (const todo of visible) {
        if (todo.parentId === parentId) {
          ids.add(todo.id)
          addDescendants(todo.id)
        }
      }
    }
    addDescendants(draggingId)
    return ids
  }, [draggingId, visible])

  useEffect(() => {
    const onWindowDragEnd = () => clearDrag()
    window.addEventListener('dragend', onWindowDragEnd)
    return () => window.removeEventListener('dragend', onWindowDragEnd)
  }, [])

  const acceptWorkspaceLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!hasWorkspaceDrag(event) || !onLeaveWorkspace) return false
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    return true
  }

  const dropWorkspaceLeave = (event: React.DragEvent<HTMLElement>) => {
    const todoId = event.dataTransfer.getData(WORKSPACE_DRAG_TYPE)
    if (!todoId || !onLeaveWorkspace) return false
    event.preventDefault()
    event.stopPropagation()
    onLeaveWorkspace(todoId)
    return true
  }

  const menuTodo = menuId ? visible.find((todo) => todo.id === menuId) ?? null : null
  const menuSiblings = menuTodo ? siblingTasks(visible, menuTodo.parentId) : []
  const menuIndex = menuTodo ? menuSiblings.findIndex((todo) => todo.id === menuTodo.id) : -1
  const menuCanChange = menuTodo != null && (!isTodayView || (operableIds?.has(menuTodo.id) ?? false))
  const menuAlreadyToday = menuTodo ? scheduledIds.has(menuTodo.id) : false
  const menuCanSchedule = Boolean(onPromote && menuTodo && menuTodo.status !== 'done' && menuTodo.status !== 'cancelled' && !menuAlreadyToday)
  const menuCanRemove = Boolean(onRemoveFromToday && isTodayView && menuAlreadyToday)

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onDragOver={(event) => {
        if (acceptWorkspaceLeave(event)) return
      }}
      onDrop={(event) => {
        if (dropWorkspaceLeave(event)) return
      }}
    >
      {error && <p className="shrink-0 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 pt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1 px-3 text-xs md:h-7 md:px-2 md:text-[11px]"
          onClick={() => startAdd(null, 'action')}
          disabled={saving || (addingRoot && Boolean(adding))}
        >
          <Plus className="size-3.5" />
          新增任务
        </Button>
        <StatusFilterButton selected={statusFilter} onChange={setStatusFilter} />
        <TagManagerButton onChanged={onTodosChanged} />
        {phone && <FocusModeTool presentation="inline" />}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 pt-2"
        onDragOver={(event) => {
          if (acceptWorkspaceLeave(event)) return
          if (!draggingId || rootTasks.length === 0) return
          if ((event.target as HTMLElement).closest('[data-outline-row]')) return
          event.preventDefault()
          const last = rootTasks[rootTasks.length - 1]
          if (last.id !== draggingId) setDropTarget({ id: last.id, position: 'after' })
        }}
        onDrop={(event) => {
          if (dropWorkspaceLeave(event)) return
          if (!draggingId || !dropTarget) return
          event.preventDefault()
          void moveNode(draggingId, dropTarget)
          clearDrag()
        }}
      >
        {addingRoot && adding && adding.kind !== 'note' && (
          <div className="mb-2">
            <AddRow
              kind={adding.kind}
              value={draft}
              saving={saving}
              onChange={setDraft}
              onSubmit={() => void createNode({ title: draft, parentId: null, kind: adding.kind })}
              onCancel={() => { setAdding(null); setDraft('') }}
            />
          </div>
        )}

        {!ready ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            {isTodayView ? '加载今天大纲…' : '加载本周大纲…'}
          </div>
        ) : weekTodos.every((todo) => outlineRole(todo) !== 'task') && !adding ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center">
            <p className="text-sm font-medium">{isTodayView ? '今天还没有安排任务' : '本周还没有任务'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isTodayView ? '从本周点「加入今天」，或在上面新增。' : '点击上方「新增任务」开始。'}
            </p>
          </div>
        ) : rootTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center">
            <p className="text-sm font-medium">没有符合筛选的任务</p>
            <p className="mt-1 text-xs text-muted-foreground">调整过滤状态或情景模式后再看。</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rootTasks.map((node) => (
              <OutlineRow
                key={node.id}
                node={node}
                collapsed={collapsed}
                editingId={editingId}
                editTitle={editTitle}
                adding={adding}
                draft={draft}
                saving={saving}
                draggingId={draggingId}
                dropTarget={dropTarget}
                blockedDropIds={blockedDropIds}
                isTodayView={isTodayView}
                todayKey={todayKey}
                scheduledIds={scheduledIds}
                operableIds={operableIds}
                commandPressed={commandPressed}
                onToggleCollapse={toggleCollapse}
                onChangeStatus={changeStatus}
                onDelete={deleteNode}
                onStartEdit={(todo) => { setEditingId(todo.id); setEditTitle(todo.title) }}
                onEditTitle={setEditTitle}
                onSaveTitle={saveTitle}
                onStartAdd={startAdd}
                onDraft={setDraft}
                onSubmitAdd={() => adding && adding.kind !== 'note' && void createNode({ title: draft, parentId: adding.parentId, kind: adding.kind })}
                onCancelAdd={() => { setAdding(null); setDraft('') }}
                onPromote={onPromote}
                onRemoveFromToday={onRemoveFromToday}
                onSelect={onSelect}
                onOpenNotes={onOpenNotes}
                selectedId={selectedId}
                workspaceTodoIds={workspaceTodoIds}
                onOpenMenu={setMenuId}
                onDragStart={(id) => { setDraggingId(id); setDropTarget(null) }}
                onDragOver={(next) => setDropTarget(next)}
                onDrop={(id, next) => { void moveNode(id, next) }}
                onDragEnd={clearDrag}
              />
            ))}
          </div>
        )}
      </div>
      {menuTodo && (
        <TaskTouchMenu
          todo={menuTodo}
          canMoveUp={menuIndex > 0}
          canMoveDown={menuIndex >= 0 && menuIndex < menuSiblings.length - 1}
          canSchedule={menuCanSchedule}
          canRemoveFromToday={menuCanRemove}
          canAddChild={menuCanChange}
          inWorkspace={workspaceTodoIds?.has(menuTodo.id) ?? false}
          onClose={() => setMenuId(null)}
          onEdit={() => {
            setMenuId(null)
            setEditingId(menuTodo.id)
            setEditTitle(menuTodo.title)
          }}
          onAddChild={() => {
            setMenuId(null)
            startAdd(menuTodo.id, 'action')
          }}
          onNotes={() => {
            setMenuId(null)
            ;(onOpenNotes ?? onSelect)?.(menuTodo)
          }}
          onPromote={onPromote ? () => { setMenuId(null); onPromote(menuTodo.id) } : undefined}
          onRemoveFromToday={onRemoveFromToday ? () => { setMenuId(null); onRemoveFromToday(menuTodo.id) } : undefined}
          onEnter={onEnterWorkspace ? () => { setMenuId(null); onEnterWorkspace(menuTodo.id) } : undefined}
          onLeave={onLeaveWorkspace ? () => { setMenuId(null); onLeaveWorkspace(menuTodo.id) } : undefined}
          onNudge={(direction) => {
            setMenuId(null)
            nudgeNode(menuTodo.id, direction)
          }}
          onDelete={() => {
            setMenuId(null)
            void deleteNode(menuTodo)
          }}
        />
      )}
    </div>
  )
}

function OutlineRow({
  node,
  collapsed,
  editingId,
  editTitle,
  adding,
  draft,
  saving,
  draggingId,
  dropTarget,
  blockedDropIds,
  isTodayView,
  todayKey,
  scheduledIds,
  operableIds,
  commandPressed,
  onToggleCollapse,
  onChangeStatus,
  onDelete,
  onStartEdit,
  onEditTitle,
  onSaveTitle,
  onStartAdd,
  onDraft,
  onSubmitAdd,
  onCancelAdd,
  onPromote,
  onRemoveFromToday,
  onSelect,
  onOpenNotes,
  selectedId,
  workspaceTodoIds,
  onOpenMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  node: OutlineTreeNode
  collapsed: Set<string>
  editingId: string | null
  editTitle: string
  adding: Adding | null
  draft: string
  saving: boolean
  draggingId: string | null
  dropTarget: DropTarget | null
  blockedDropIds: Set<string>
  isTodayView: boolean
  todayKey: string
  scheduledIds: Set<string>
  operableIds: Set<string> | null
  commandPressed: boolean
  onToggleCollapse: (id: string) => void
  onChangeStatus: (todo: OutlineTreeNode, status: TodoStatus) => void
  onDelete: (todo: OutlineTreeNode) => void
  onStartEdit: (todo: Todo) => void
  onEditTitle: (title: string) => void
  onSaveTitle: (todo: Todo) => void
  onStartAdd: (parentId: string | null, kind: TodoKind) => void
  onDraft: (value: string) => void
  onSubmitAdd: () => void
  onCancelAdd: () => void
  onPromote?: (todoId: string) => void
  onRemoveFromToday?: (todoId: string) => void
  onSelect?: (todo: Todo) => void
  onOpenNotes?: (todo: Todo) => void
  selectedId?: string | null
  workspaceTodoIds?: ReadonlySet<string>
  onOpenMenu?: (id: string) => void
  onDragStart: (id: string) => void
  onDragOver: (target: DropTarget) => void
  onDrop: (sourceId: string, target: DropTarget) => void
  onDragEnd: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  if (outlineRole(node) === 'note') return null

  const taskChildren = outlineTaskChildren(node)
  const hasChildren = taskChildren.length > 0
  const isCollapsed = collapsed.has(node.id)
  const progress = countOutlineProgress(node)
  const addingHere = adding?.parentId === node.id && adding.kind !== 'note'
  const isDragging = draggingId === node.id
  const isDropTarget = dropTarget?.id === node.id && draggingId != null && draggingId !== node.id
  const dropPosition = isDropTarget ? dropTarget.position : null
  const editing = editingId === node.id
  const canDrag = !editing && !saving
  const selected = selectedId === node.id
  const inWorkspace = workspaceTodoIds?.has(node.id) ?? false
  const alreadyToday = scheduledIds.has(node.id)
  const canChangeStatus = !isTodayView || (operableIds?.has(node.id) ?? false)
  const canSchedule = Boolean(onPromote) && node.status !== 'done' && node.status !== 'cancelled' && !alreadyToday
  const canRemoveFromToday = Boolean(onRemoveFromToday) && isTodayView && alreadyToday
  const delayDays = alreadyToday ? todayDelayDays(node, todayKey) : 0

  const startDrag = (event: React.DragEvent<HTMLElement>) => {
    if (!canDrag) {
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(OUTLINE_DRAG_TYPE, node.id)
    event.dataTransfer.setData('text/plain', node.id)
    event.dataTransfer.effectAllowed = 'move'
    if (rowRef.current) event.dataTransfer.setDragImage(rowRef.current, 24, 12)
    onDragStart(node.id)
  }

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!draggingId || blockedDropIds.has(node.id)) return
    const position = dropPositionFromEvent(event)
    const newParentId = position === 'into' ? node.id : node.parentId
    if (newParentId != null && blockedDropIds.has(newParentId)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    onDragOver({ id: node.id, position })
  }

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    if (!draggingId || blockedDropIds.has(node.id)) return
    event.preventDefault()
    event.stopPropagation()
    const position = dropPositionFromEvent(event)
    const newParentId = position === 'into' ? node.id : node.parentId
    if (newParentId != null && blockedDropIds.has(newParentId)) {
      onDragEnd()
      return
    }
    onDrop(draggingId, { id: node.id, position })
    onDragEnd()
  }

  return (
    <div>
      <div
        ref={rowRef}
        data-outline-row={node.id}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'group relative flex items-start gap-1 rounded-md px-1 py-1 transition-colors',
          hasChildren && 'mt-2 first:mt-0',
          isDragging && 'opacity-40',
          !isDropTarget && 'hover:bg-neutral-200 dark:hover:bg-neutral-700',
          selected && 'bg-muted',
          dropPosition === 'into' && 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400',
        )}
      >
        {dropPosition === 'before' && (
          <span className="pointer-events-none absolute inset-x-2 -top-0.5 z-10 h-0.5 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" />
        )}
        {dropPosition === 'after' && (
          <span className="pointer-events-none absolute inset-x-2 -bottom-0.5 z-10 h-0.5 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" />
        )}
        <button
          type="button"
          draggable={canDrag}
          aria-label={`拖拽调整 ${node.title}`}
          onDragStart={startDrag}
          onDragEnd={onDragEnd}
          className={cn(
            'hover-only mt-1 flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition-colors',
            canDrag && 'cursor-grab hover:bg-background hover:text-foreground active:cursor-grabbing group-hover:text-foreground',
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
        {hasChildren ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleCollapse(node.id)
            }}
            className="touch-hit flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={isCollapsed ? '展开' : '收起'}
          >
            <ChevronDown className={cn('size-3.5 transition-transform', isCollapsed && '-rotate-90')} />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        {canChangeStatus ? (
          <StatusPicker
            compact
            status={node.status}
            disabled={saving}
            onChange={(status) => onChangeStatus(node, status)}
          />
        ) : canSchedule ? (
          <button
            type="button"
            aria-label={`把 ${node.title} 加入今天`}
            title="加入今天"
            onClick={() => onPromote?.(node.id)}
            className="touch-hit flex size-6 shrink-0 items-center justify-center rounded border border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="size-3.5" />
          </button>
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded">
            <StatusGlyph status={node.status} className="size-3.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
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
              className="h-10 text-base md:h-6 md:text-sm"
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
                'touch-row-title flex min-h-6 w-full items-center gap-1.5 rounded px-0.5 text-left text-sm leading-6 hover:text-foreground group-hover:font-semibold',
                hasChildren && 'font-semibold',
                !canChangeStatus && 'text-muted-foreground',
                (node.status === 'done' || node.status === 'cancelled') && 'text-muted-foreground line-through',
              )}
            >
              {inWorkspace && <span className="size-1.5 shrink-0 rounded-full bg-sky-500" title="在工作区" />}
              <span className="min-w-0 truncate">{node.title}</span>
              {delayDays > 0 && (
                <span className="shrink-0 rounded bg-amber-100 px-1 py-px text-[10px] font-normal tabular-nums text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  延误 {delayDays} 天
                </span>
              )}
            </button>
          )}
          {hasChildren && progress.total > 0 && (
            <p className="text-[10px] leading-4 tabular-nums text-muted-foreground">{progress.done}/{progress.total} 完成</p>
          )}
        </div>
        <button
          type="button"
          aria-label={`${node.title} 的更多操作`}
          onClick={(event) => {
            event.stopPropagation()
            onOpenMenu?.(node.id)
          }}
          className="touch-only size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground active:bg-background"
        >
          <MoreHorizontal className="size-4" />
        </button>
        <div className="hover-only flex h-6 shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {canChangeStatus && (
            <button type="button" onClick={() => onStartAdd(node.id, 'action')} className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground" title="挂一个衍生任务">
              <Plus className="mr-0.5 inline size-3" />子任务
            </button>
          )}
          <button
            type="button"
            onClick={() => (onOpenNotes ?? onSelect)?.(node)}
            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
          >
            备注
          </button>
          {canSchedule && !isTodayView && (
            <button type="button" onClick={() => onPromote?.(node.id)} className="rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10">加入今天</button>
          )}
          {canRemoveFromToday && (
            <button
              type="button"
              onClick={() => onRemoveFromToday?.(node.id)}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
            >
              移出今日
            </button>
          )}
          {commandPressed && (
            <button
              type="button"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onDelete(node)
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-destructive hover:bg-background hover:text-destructive disabled:opacity-50"
            >
              删除
            </button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div
          className={cn(
            'ml-5 border-l border-dashed pl-2 transition-colors',
            dropPosition === 'into' && 'border-emerald-400 bg-emerald-500/5',
          )}
          onDragOver={(event) => {
            if (!draggingId || blockedDropIds.has(node.id)) return
            if ((event.target as HTMLElement).closest('[data-outline-row]')) return
            event.preventDefault()
            event.stopPropagation()
            event.dataTransfer.dropEffect = 'move'
            onDragOver({ id: node.id, position: 'into' })
          }}
          onDrop={(event) => {
            if (!draggingId || blockedDropIds.has(node.id)) return
            event.preventDefault()
            event.stopPropagation()
            onDrop(draggingId, { id: node.id, position: 'into' })
            onDragEnd()
          }}
        >
          {taskChildren.map((child) => (
            <OutlineRow
              key={child.id}
              node={child}
              collapsed={collapsed}
              editingId={editingId}
              editTitle={editTitle}
              adding={adding}
              draft={draft}
              saving={saving}
              draggingId={draggingId}
              dropTarget={dropTarget}
              blockedDropIds={blockedDropIds}
              isTodayView={isTodayView}
              todayKey={todayKey}
              scheduledIds={scheduledIds}
              operableIds={operableIds}
              commandPressed={commandPressed}
              onToggleCollapse={onToggleCollapse}
              onChangeStatus={onChangeStatus}
              onDelete={onDelete}
              onStartEdit={onStartEdit}
              onEditTitle={onEditTitle}
              onSaveTitle={onSaveTitle}
              onStartAdd={onStartAdd}
              onDraft={onDraft}
              onSubmitAdd={onSubmitAdd}
              onCancelAdd={onCancelAdd}
              onPromote={onPromote}
              onRemoveFromToday={onRemoveFromToday}
              onSelect={onSelect}
              onOpenNotes={onOpenNotes}
              selectedId={selectedId}
              workspaceTodoIds={workspaceTodoIds}
              onOpenMenu={onOpenMenu}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
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
  const label = kind === 'note' ? '备注' : '任务'
  return (
    <form
      className="flex items-center gap-2 py-1"
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
        className="h-10 text-base md:h-7 md:text-sm"
        autoFocus
      />
      <Button type="submit" size="sm" className="h-10 px-3 text-sm md:h-7 md:px-2 md:text-[11px]" disabled={saving || !value.trim()}>添加</Button>
      <Button type="button" size="sm" variant="ghost" className="h-10 px-3 text-sm md:h-7 md:px-2 md:text-[11px]" onClick={onCancel}>取消</Button>
    </form>
  )
}

function TaskTouchMenu({
  todo,
  canMoveUp,
  canMoveDown,
  canSchedule,
  canRemoveFromToday,
  canAddChild,
  inWorkspace,
  onClose,
  onEdit,
  onAddChild,
  onNotes,
  onPromote,
  onRemoveFromToday,
  onEnter,
  onLeave,
  onNudge,
  onDelete,
}: {
  todo: Todo
  canMoveUp: boolean
  canMoveDown: boolean
  canSchedule: boolean
  canRemoveFromToday: boolean
  canAddChild: boolean
  inWorkspace: boolean
  onClose: () => void
  onEdit: () => void
  onAddChild: () => void
  onNotes: () => void
  onPromote?: () => void
  onRemoveFromToday?: () => void
  onEnter?: () => void
  onLeave?: () => void
  onNudge: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <MobileActionSheet title={todo.title} onClose={onClose}>
      {confirming ? (
        <div className="grid gap-3 px-4 py-3">
          <p className="text-sm">删除这个任务后，它的子任务也会一起删除。</p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" className="h-10 flex-1" onClick={onDelete}>
              删除
            </Button>
            <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => setConfirming(false)}>
              取消
            </Button>
          </div>
        </div>
      ) : (
        <>
          {inWorkspace
            ? onLeave && <MobileAction label="移出工作区" onSelect={onLeave} />
            : onEnter && <MobileAction label="开始" onSelect={onEnter} />}
          <MobileAction label="备注" onSelect={onNotes} />
          {canAddChild && <MobileAction label="添加子任务" onSelect={onAddChild} />}
          <MobileAction label="编辑标题" onSelect={onEdit} />
          {canSchedule && onPromote && <MobileAction label="加入今天" onSelect={onPromote} />}
          {canRemoveFromToday && onRemoveFromToday && <MobileAction label="移出今日" onSelect={onRemoveFromToday} />}
          <MobileAction label="上移" disabled={!canMoveUp} onSelect={() => onNudge(-1)} />
          <MobileAction label="下移" disabled={!canMoveDown} onSelect={() => onNudge(1)} />
          <MobileAction label="删除" destructive onSelect={() => setConfirming(true)} />
        </>
      )}
    </MobileActionSheet>
  )
}
