'use client'

import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, Circle, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatEstimatedDuration, normalizeEstimatedHours } from '@/backstage/week-plan/week-plan-hours'
import { cn } from '@/lib/utils'
import {
  buildTodoTree,
  hasActivityDragPayload,
  parseActivityDragPayload,
  useTodoStore,
  type ActivityDragPayload,
  type TodoItem,
} from './todo-store'
import { apiFetchCopilotLog, apiParseTodoCopilot, formatWeekStartClient, type CopilotLlmLog } from './week-plan-api'
import { shiftWeekStart } from '@/backstage/week-plan/week-utils'
import type { Todo } from '@/types/todo'
import { TodoActivityView } from '@/app/dashboard/todo-activity-view'
import { TodoTimelineCalendar } from './todo-timeline-calendar'

function getSundayOfWeekContaining(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function getYearWeekLabel(date: Date): string {
  const year = date.getFullYear()
  const weekStart = getSundayOfWeekContaining(date)
  const firstWeekStart = getSundayOfWeekContaining(new Date(year, 0, 1))
  const diffDays = Math.floor(
    (weekStart.getTime() - firstWeekStart.getTime()) / 86400000
  )
  const week = Math.floor(diffDays / 7) + 1
  return `${year}年 第${week}周`
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

type WeekDayTab = {
  dayIndex: number
  date: Date
  label: string
  isToday: boolean
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function getVisibleWeekDayTabs(anchor: Date): WeekDayTab[] {
  const sunday = getSundayOfWeekContaining(anchor)
  const today = startOfLocalDay(new Date())
  const weekSunday = startOfLocalDay(sunday)
  const weekSaturday = new Date(weekSunday)
  weekSaturday.setDate(weekSunday.getDate() + 6)

  const isPastWeek = weekSaturday < today
  const isFutureWeek = weekSunday > today
  const tabs: WeekDayTab[] = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + dayIndex)
    const dayStart = startOfLocalDay(date)
    if (!isPastWeek && !isFutureWeek && dayStart > today) break

    const isToday = dayStart.getTime() === today.getTime()
    const md = `${date.getMonth() + 1}/${date.getDate()}`
    tabs.push({
      dayIndex,
      date,
      label: isToday ? `今天 ${md}` : `${WEEKDAY_LABELS[dayIndex]} ${md}`,
      isToday,
    })
  }
  return tabs
}

function DayTabBar({
  tabs,
  activeDayIndex,
  onActiveDayChange,
}: {
  tabs: WeekDayTab[]
  activeDayIndex: number
  onActiveDayChange: (dayIndex: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="每日待办日期">
      {tabs.map((tab) => {
        const isActive = tab.dayIndex === activeDayIndex
        return (
          <button
            key={tab.dayIndex}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onActiveDayChange(tab.dayIndex)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive &&
                tab.isToday &&
                'border-emerald-300/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100',
              isActive &&
                !tab.isToday &&
                'border-neutral-200 bg-white text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100',
              !isActive &&
                'border-transparent text-neutral-500 hover:border-neutral-200 hover:bg-white hover:text-neutral-900 dark:hover:border-neutral-800 dark:hover:bg-neutral-950 dark:hover:text-neutral-100'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function PendingActivityCard({
  id,
  title,
  day,
  hour,
}: {
  id: string
  title: string
  day: number
  hour: number
}) {
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const onDragStart = (e: React.DragEvent) => {
    const payloadObj = {
      kind: 'week-activity',
      source: 'pending',
      id,
      title,
      day,
      hour,
    } satisfies ActivityDragPayload
    const payload = JSON.stringify(payloadObj)
    setDraggingPayload(payloadObj)
    e.dataTransfer.setData('application/json', payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className="flex max-w-full min-w-0 shrink-0 cursor-grab flex-col justify-start overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-950"
      style={{ width: `${Math.max(hour, 1) * 72}px` }}
    >
      <span className="block min-w-0 truncate font-medium leading-tight">{title}</span>
      <span className="mt-1 text-[10px] text-neutral-500">预计 {day} 小时</span>
    </div>
  )
}

function TodoRow({
  item,
  now,
  depth = 0,
  hasChildren = false,
  subtaskProgress,
  onStart,
  onComplete,
  onRemove,
  onEdit,
}: {
  item: TodoItem
  now: number
  depth?: number
  hasChildren?: boolean
  subtaskProgress?: { done: number; total: number }
  onStart: () => void
  onComplete: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const isActive = item.status === 'active'
  const isDone = item.status === 'done'
  const isClosed = isDone || item.status === 'cancelled'
  const elapsed =
    isActive && item.startedAtMs != null ? formatElapsed(now - item.startedAtMs) : null
  const canDrag = !hasChildren

  const onDragStart = (e: React.DragEvent) => {
    if (!canDrag) return
    const payloadObj = {
      kind: 'week-activity',
      source: 'todo',
      id: item.id,
      title: item.title,
      day: item.estimatedHours,
      hour: item.hour,
    } satisfies ActivityDragPayload
    const payload = JSON.stringify(payloadObj)
    setDraggingPayload(payloadObj)
    e.dataTransfer.setData('application/json', payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <li
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className={cn(
        'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        depth > 0 && 'ml-6 border-dashed',
        canDrag && 'cursor-grab active:cursor-grabbing',
        isActive &&
          'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-700/60 dark:bg-emerald-950/30',
        !isActive &&
          !isDone &&
          'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950',
        isDone && 'border-neutral-100 bg-neutral-50/80 opacity-60 dark:border-neutral-800/60 dark:bg-neutral-900/40'
      )}
    >
      <button
        type="button"
        onClick={isClosed || hasChildren ? undefined : onComplete}
        disabled={isClosed || hasChildren}
        aria-label={isDone ? '已完成' : hasChildren ? '父任务' : '标记完成'}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          isDone
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : hasChildren
              ? 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800'
              : 'border-neutral-300 text-neutral-400 hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-600 dark:hover:border-emerald-500'
        )}
      >
        {isDone ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-medium',
              isDone && 'line-through text-neutral-500',
              depth > 0 && 'text-neutral-700 dark:text-neutral-300'
            )}
          >
            {item.title}
          </span>
          {isActive && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              进行中
            </span>
          )}
          {item.status === 'blocked' && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">阻塞</span>
          )}
          {item.status === 'cancelled' && (
            <span className="shrink-0 rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-300">已取消</span>
          )}
          {hasChildren && subtaskProgress && (
            <span className="shrink-0 text-[10px] text-neutral-500">
              {subtaskProgress.done}/{subtaskProgress.total} 完成
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">
          预计 {formatEstimatedDuration(item.estimatedHours)}
          {elapsed != null && (
            <span className="ml-2 tabular-nums text-emerald-700 dark:text-emerald-400">
              · {elapsed}
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label="编辑任务"
          className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <Pencil className="size-3.5" />
        </button>
        {!isClosed && !isActive && !hasChildren && (
          <button
            type="button"
            onClick={onStart}
            aria-label="开始"
            className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <Play className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="移除"
          className="flex size-7 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  )
}

type DraftSubtask = {
  id: string
  parentId: string
  title: string
  estimatedHours: string
}

const DRAFT_PARENT_ID = 'parent-draft'

function createDraftSubtask(): DraftSubtask {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parentId: DRAFT_PARENT_ID,
    title: '',
    estimatedHours: '0.5',
  }
}

function TodoRowGroup({
  item,
  now,
  depth = 0,
  onStart,
  onComplete,
  onRemove,
  onEdit,
}: {
  item: TodoItem
  now: number
  depth?: number
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (item: TodoItem) => void
}) {
  const children = item.subtasks ?? []
  const hasChildren = children.length > 0
  const doneCount = children.filter((s) => s.status === 'done').length

  return (
    <>
      <TodoRow
        item={item}
        now={now}
        depth={depth}
        hasChildren={hasChildren}
        subtaskProgress={hasChildren ? { done: doneCount, total: children.length } : undefined}
        onStart={() => onStart(item.id)}
        onComplete={() => onComplete(item.id)}
        onRemove={() => onRemove(item.id)}
        onEdit={() => onEdit(item)}
      />
      {children.map((sub) => (
        <TodoRowGroup
          key={sub.id}
          item={sub}
          now={now}
          depth={depth + 1}
          onStart={onStart}
          onComplete={onComplete}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </>
  )
}

function TodoDetailDialog({
  item,
  open,
  onOpenChange,
  updateTodo,
  addSubtask,
}: {
  item: TodoItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  updateTodo: ReturnType<typeof useTodoStore.getState>['updateTodo']
  addSubtask: ReturnType<typeof useTodoStore.getState>['addSubtask']
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<TodoItem['status']>('pending')
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setDescription(item.description)
    setContent(item.content)
    setStatus(item.status)
    setSubtaskTitle('')
    setError(null)
  }, [item])

  const save = async () => {
    if (!item || !title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await updateTodo(item.id, {
        title: title.trim(), description, content, status, version: item.version,
      })
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请重新打开任务后再试')
    } finally {
      setSaving(false)
    }
  }

  const createChild = async () => {
    if (!item || !subtaskTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addSubtask(item.id, { title: subtaskTitle.trim() })
      setSubtaskTitle('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '子任务创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>任务详情</DialogTitle>
          <DialogDescription>任务定义与执行状态都保存到统一 Todo 域。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="todo-title">标题</Label>
            <Input id="todo-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="todo-description">描述与验收标准</Label>
            <Textarea id="todo-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明目标、范围和完成标准" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="todo-content">执行状态</Label>
            <Textarea id="todo-content" rows={8} value={content} onChange={(event) => setContent(event.target.value)} placeholder="记录当前进度、关键发现、下一步和阻塞项" className="font-mono text-xs" />
            <p className="text-xs text-neutral-500">该内容也可由 Codex 通过 MCP 持续更新。</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="todo-status">状态</Label>
            <select id="todo-status" value={status} onChange={(event) => setStatus(event.target.value as TodoItem['status'])} className="h-10 rounded-md border border-neutral-200 bg-background px-3 text-sm dark:border-neutral-800">
              <option value="pending">待处理</option>
              <option value="active">进行中</option>
              <option value="blocked">阻塞</option>
              <option value="done">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <div className="grid gap-1.5 rounded-lg border border-dashed p-3 dark:border-neutral-800">
            <Label htmlFor="todo-subtask">添加子任务</Label>
            <div className="flex gap-2">
              <Input id="todo-subtask" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="输入子任务标题" />
              <Button type="button" variant="outline" disabled={saving || !subtaskTitle.trim()} onClick={() => void createChild()}>添加</Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="button" disabled={saving || !title.trim()} onClick={() => void save()}>{saving ? '保存中…' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddTodoDialog({
  open,
  onOpenChange,
  dayLabel,
  onSubmitTree,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayLabel: string
  onSubmitTree: (input: {
    parent?: { title: string }
    subtasks?: Array<{ title: string; estimatedHours: number }>
    root?: { title: string; estimatedHours: number }
  }) => Promise<void>
}) {
  const [copilotText, setCopilotText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('1')
  const [parentTitle, setParentTitle] = useState('')
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([])
  const [treeMode, setTreeMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastLogId, setLastLogId] = useState<string | null>(null)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [inspectLog, setInspectLog] = useState<CopilotLlmLog | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [inspectError, setInspectError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setCopilotText('')
    setParsing(false)
    setParseError(null)
    setTitle('')
    setEstimatedHours('1')
    setParentTitle('')
    setSubtasks([])
    setTreeMode(false)
    setSubmitting(false)
    setLastLogId(null)
    setInspectOpen(false)
    setInspectLog(null)
    setInspectLoading(false)
    setInspectError(null)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset]
  )

  const applyParseResult = useCallback(
    (result: Awaited<ReturnType<typeof apiParseTodoCopilot>>) => {
      if (result.subtasks.length > 0 && result.parent) {
        setTreeMode(true)
        setParentTitle(result.parent.title)
        setSubtasks(
          result.subtasks.map((s) => ({
            id: s.id,
            parentId: result.parent!.id,
            title: s.title,
            estimatedHours: String(s.estimatedHours),
          }))
        )
        setTitle('')
        setEstimatedHours('1')
      } else if (result.root) {
        setTreeMode(false)
        setTitle(result.root.title)
        setEstimatedHours(String(result.root.estimatedHours))
        setParentTitle('')
        setSubtasks([])
      }
    },
    []
  )

  const runParse = useCallback(async () => {
    const text = copilotText.trim()
    if (!text || parsing) return
    setParsing(true)
    setParseError(null)
    setInspectOpen(false)
    setInspectLog(null)
    setInspectError(null)
    try {
      const result = await apiParseTodoCopilot({ text, dayLabel })
      setLastLogId(result.logId)
      applyParseResult(result)
    } catch (error) {
      const err = error as Error & { logId?: string }
      if (err.logId) setLastLogId(err.logId)
      setParseError(err.message ?? '解析失败')
    } finally {
      setParsing(false)
    }
  }, [applyParseResult, copilotText, dayLabel, parsing])

  const openInspect = useCallback(async () => {
    if (!lastLogId) return
    setInspectOpen(true)
    setInspectLoading(true)
    setInspectError(null)
    try {
      const log = await apiFetchCopilotLog(lastLogId)
      setInspectLog(log)
    } catch (error) {
      setInspectLog(null)
      setInspectError(error instanceof Error ? error.message : '加载日志失败')
    } finally {
      setInspectLoading(false)
    }
  }, [lastLogId])

  const enterTreeMode = useCallback(() => {
    setTreeMode(true)
    setParentTitle((prev) => prev.trim() || title.trim())
    setTitle('')
    setEstimatedHours('1')
    setSubtasks((prev) => (prev.length > 0 ? prev : [createDraftSubtask()]))
  }, [title])

  const addSubtask = useCallback(() => {
    if (!treeMode) {
      enterTreeMode()
      return
    }
    setSubtasks((prev) => [...prev, createDraftSubtask()])
  }, [enterTreeMode, treeMode])

  const removeSubtask = useCallback((index: number) => {
    setSubtasks((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setTreeMode(false)
        setParentTitle((parent) => {
          const p = parent.trim()
          if (p) setTitle((t) => t.trim() || p)
          return ''
        })
      }
      return next
    })
  }, [])

  const exitTreeMode = useCallback(() => {
    setTreeMode(false)
    setSubtasks([])
    setParentTitle((parent) => {
      const p = parent.trim()
      if (p) setTitle((t) => t.trim() || p)
      return ''
    })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (submitting) return
      setSubmitting(true)
      try {
        if (treeMode && subtasks.length > 0) {
          const trimmedParent = parentTitle.trim()
          if (!trimmedParent) return
          const validSubs = subtasks
            .map((s) => ({
              title: s.title.trim(),
              estimatedHours: normalizeEstimatedHours(Number(s.estimatedHours) || 0.5),
            }))
            .filter((s) => s.title)
          if (validSubs.length === 0) return
          await onSubmitTree({ parent: { title: trimmedParent }, subtasks: validSubs })
        } else {
          const trimmed = title.trim()
          if (!trimmed) return
          await onSubmitTree({
            root: {
              title: trimmed,
              estimatedHours: normalizeEstimatedHours(Number(estimatedHours) || 1),
            },
          })
        }
        handleOpenChange(false)
      } finally {
        setSubmitting(false)
      }
    },
    [
      treeMode,
      subtasks,
      parentTitle,
      title,
      estimatedHours,
      onSubmitTree,
      handleOpenChange,
      submitting,
    ]
  )

  const parentTotalHours = subtasks.reduce(
    (sum, s) => sum + normalizeEstimatedHours(Number(s.estimatedHours) || 0.5),
    0
  )

  const canSubmit =
    treeMode && subtasks.length > 0
      ? parentTitle.trim().length > 0 && subtasks.some((s) => s.title.trim())
      : title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName="bg-neutral-950/30 backdrop-blur-[3px] duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        className={cn(
          'sm:max-w-[440px] duration-300 ease-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2',
          'data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:slide-out-to-top-[48%]'
        )}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增任务</DialogTitle>
            <DialogDescription>添加到 {dayLabel} 的待办列表</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="todo-copilot">AI Copilot</Label>
                <button
                  type="button"
                  onClick={() => void openInspect()}
                  disabled={!lastLogId || inspectLoading}
                  title="查看本次 LLM 交互日志"
                  aria-label="查看本次 LLM 交互日志"
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md border transition-colors',
                    lastLogId
                      ? 'border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                      : 'cursor-not-allowed border-neutral-100 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600'
                  )}
                >
                  <Search className="size-3.5" />
                </button>
              </div>
              <Textarea
                id="todo-copilot"
                value={copilotText}
                onChange={(e) => setCopilotText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey && copilotText.trim() && !parsing) {
                    e.preventDefault()
                    void runParse()
                  }
                }}
                placeholder="描述任务，如：完成季度汇报 PPT"
                rows={2}
                disabled={parsing}
                className="min-h-[2.5rem] resize-none text-sm"
                autoFocus
              />
              <p className="text-xs text-neutral-500">
                {parsing ? '整理中…' : '按 Tab 由 AI 整理（超 1 小时将自动拆解为子任务）'}
              </p>
              {parseError && <p className="text-xs text-red-600">{parseError}</p>}
              {inspectOpen && (
                <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50/80 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">
                      LLM 交互日志
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      收起
                    </button>
                  </div>
                  {inspectLoading ? (
                    <p className="text-neutral-500">加载中…</p>
                  ) : inspectError ? (
                    <p className="text-red-600">{inspectError}</p>
                  ) : inspectLog ? (
                    <div className="grid max-h-64 gap-3 overflow-y-auto">
                      <div>
                        <p className="mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                          模型
                        </p>
                        <p className="text-neutral-800 dark:text-neutral-200">{inspectLog.model}</p>
                      </div>
                      {inspectLog.messages.map((msg, i) => (
                        <div key={`${msg.role}-${i}`}>
                          <p className="mb-1 font-medium capitalize text-neutral-600 dark:text-neutral-400">
                            {msg.role === 'system' ? 'System Prompt' : msg.role === 'user' ? 'User Prompt' : msg.role}
                          </p>
                          <pre className="whitespace-pre-wrap break-words rounded-md border border-neutral-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                            {msg.content}
                          </pre>
                        </div>
                      ))}
                      <div>
                        <p className="mb-1 font-medium text-neutral-600 dark:text-neutral-400">
                          返回
                        </p>
                        <pre className="whitespace-pre-wrap break-words rounded-md border border-neutral-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
                          {inspectLog.responseText ?? '（无返回内容）'}
                        </pre>
                      </div>
                      {inspectLog.error && (
                        <div>
                          <p className="mb-1 font-medium text-red-600">错误</p>
                          <p className="text-red-600">{inspectLog.error}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {treeMode ? (
              <div className="grid gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="grid gap-2">
                  <Label htmlFor="todo-parent-title">父任务</Label>
                  <Input
                    id="todo-parent-title"
                    value={parentTitle}
                    onChange={(e) => setParentTitle(e.target.value)}
                    placeholder="父任务标题"
                  />
                  {subtasks.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      总预计 {formatEstimatedDuration(parentTotalHours)}（子任务合计）
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>子任务</Label>
                    <button
                      type="button"
                      onClick={addSubtask}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    >
                      <Plus className="size-3.5" />
                      添加子任务
                    </button>
                  </div>
                  {subtasks.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-neutral-400">
                      暂无子任务，点击上方添加
                    </p>
                  ) : (
                    subtasks.map((sub, index) => (
                      <div
                        key={sub.id}
                        className="grid gap-2 rounded-md border border-dashed p-2"
                      >
                        <div className="flex items-start gap-2">
                          <Input
                            value={sub.title}
                            onChange={(e) =>
                              setSubtasks((prev) =>
                                prev.map((s, i) =>
                                  i === index ? { ...s, title: e.target.value } : s
                                )
                              )
                            }
                            placeholder={`子任务 ${index + 1}`}
                            className="text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeSubtask(index)}
                            aria-label="移除子任务"
                            className="flex size-9 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`sub-hours-${sub.id}`} className="shrink-0 text-xs">
                            时长（小时）
                          </Label>
                          <Input
                            id={`sub-hours-${sub.id}`}
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={sub.estimatedHours}
                            onChange={(e) =>
                              setSubtasks((prev) =>
                                prev.map((s, i) =>
                                  i === index ? { ...s, estimatedHours: e.target.value } : s
                                )
                              )
                            }
                            className="h-8 w-24 text-sm"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={exitTreeMode}
                  className="text-left text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  改为单条任务
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="todo-title">标题</Label>
                  <Input
                    id="todo-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="输入任务名称"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="todo-hours">预计时长（小时）</Label>
                  <Input
                    id="todo-hours"
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={enterTreeMode}
                  className="flex w-fit items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  <Plus className="size-3.5" />
                  拆解为子任务
                </button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting || parsing}>
              {submitting
                ? '添加中…'
                : treeMode && subtasks.some((s) => s.title.trim())
                  ? '添加全部'
                  : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TodoList({
  todos,
  now,
  weekAnchor,
  activeDayIndex,
  onActiveDayChange,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  actions,
}: {
  todos: TodoItem[]
  now: number
  weekAnchor: Date
  activeDayIndex: number
  onActiveDayChange: (dayIndex: number) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  actions: Pick<ReturnType<typeof useTodoStore.getState>, 'startTodo' | 'completeTodo' | 'removeTodo' | 'addTodoTree' | 'updateTodo' | 'addSubtask'>
}) {
  const { startTodo, completeTodo, removeTodo, addTodoTree, updateTodo, addSubtask } = actions
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)

  const dayTabs = useMemo(() => getVisibleWeekDayTabs(weekAnchor), [weekAnchor])
  const activeDayLabel =
    dayTabs.find((t) => t.dayIndex === activeDayIndex)?.label ?? '当日'

  const handleAddTodoTree = useCallback(
    (input: {
      parent?: { title: string }
      subtasks?: Array<{ title: string; estimatedHours: number }>
      root?: { title: string; estimatedHours: number }
    }) => addTodoTree({ ...input, dayIndex: activeDayIndex }),
    [activeDayIndex, addTodoTree]
  )

  const dayTodos = useMemo(
    () => todos.filter((t) => t.dayIndex === activeDayIndex),
    [todos, activeDayIndex]
  )

  const todoTree = useMemo(() => buildTodoTree(dayTodos), [dayTodos])

  const sorted = useMemo(() => {
    const order = { active: 0, blocked: 1, pending: 2, done: 3, cancelled: 4 } as const
    const rootStatus = (item: TodoItem) => {
      const children = item.subtasks ?? []
      if (children.length === 0) return item.status
      if (children.some((c) => c.status === 'active')) return 'active' as const
      if (children.every((c) => c.status === 'done')) return 'done' as const
      return 'pending' as const
    }
    return [...todoTree].sort((a, b) => order[rootStatus(a)] - order[rootStatus(b)])
  }, [todoTree])

  const activeCount = dayTodos.filter(
    (t) => t.status === 'active' && t.parentId != null
  ).length
  const doneCount = dayTodos.filter(
    (t) => t.status === 'done' && t.parentId != null
  ).length
  const rootDoneCount = todoTree.filter((t) => {
    const children = t.subtasks ?? []
    if (children.length === 0) return t.status === 'done'
    return children.every((c) => c.status === 'done')
  }).length

  return (
    <>
      <AddTodoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        dayLabel={activeDayLabel}
        onSubmitTree={handleAddTodoTree}
      />
      <TodoDetailDialog
        item={editingTodo}
        open={editingTodo != null}
        onOpenChange={(open) => { if (!open) setEditingTodo(null) }}
        updateTodo={updateTodo}
        addSubtask={addSubtask}
      />
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col rounded-lg border transition-colors',
          isDragOver
            ? 'border-dashed border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20'
            : 'border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30'
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
      <div className="flex shrink-0 flex-col gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {activeCount > 0 ? `${activeCount} 项进行中` : `${dayTodos.length} 项任务`}
            {doneCount > 0 && ` · 已完成 ${rootDoneCount}`}
          </p>
          <button
            type="button"
            onClick={() => setAddDialogOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Plus className="size-3.5" />
            添加
          </button>
        </div>

        <DayTabBar
          tabs={dayTabs}
          activeDayIndex={activeDayIndex}
          onActiveDayChange={onActiveDayChange}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <div
            className={cn(
              'flex h-full min-h-48 flex-col items-center justify-center rounded-md border border-dashed px-6 text-center',
              isDragOver
                ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
                : 'border-neutral-200 text-neutral-400 dark:border-neutral-700'
            )}
          >
            <p className="text-sm font-medium">拖入活动或点击添加</p>
            <p className="mt-1 text-xs">拖入后自动开始计时；手动添加需点击开始</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((item) => (
              <TodoRowGroup
                key={item.id}
                item={item}
                now={now}
                onStart={startTodo}
                onComplete={completeTodo}
                onRemove={removeTodo}
                onEdit={setEditingTodo}
              />
            ))}
          </ul>
        )}
      </div>
      </div>
    </>
  )
}

function PendingPanel({
  pending,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  embedded = false,
  addPending,
  removePending,
}: {
  pending: { id: string; title: string; day: number; hour: number }[]
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  embedded?: boolean
  addPending: ReturnType<typeof useTodoStore.getState>['addPending']
  removePending: ReturnType<typeof useTodoStore.getState>['removePending']
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [hours, setHours] = useState('1')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    void addPending({
      title: trimmed,
      estimatedHours: Math.max(1, Math.round(Number(hours) || 1)),
    }).then(() => {
      setTitle('')
      setHours('1')
      setAddOpen(false)
    })
  }

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-col gap-2 transition-colors',
        !embedded && 'rounded-lg border p-3',
        isDragOver
          ? 'border-dashed border-amber-400 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-950/20'
          : 'border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/40'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            待安排活动
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            拖到左侧自动开始；待办也可拖回此处重新安排。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
        >
          <Plus className="size-3.5" />
          添加
        </button>
      </div>

      {addOpen && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-md border border-dashed p-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="活动名称"
            className="h-8 text-xs"
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 w-20 text-xs"
            />
            <Button type="submit" size="sm" className="h-8 text-xs" disabled={!title.trim()}>
              保存
            </Button>
          </div>
        </form>
      )}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-wrap content-start items-start gap-2 overflow-y-auto">
        {pending.map((c) => (
          <div key={c.id} className="group relative">
            <PendingActivityCard {...c} />
            <button
              type="button"
              onClick={() => void removePending(c.id)}
              aria-label="删除"
              className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full border bg-white text-neutral-500 shadow group-hover:flex hover:text-red-600 dark:bg-neutral-900"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
        {pending.length === 0 && (
          <p
            className={cn(
              'w-full rounded-md border border-dashed px-3 py-6 text-center text-xs',
              isDragOver
                ? 'border-amber-400 text-amber-700 dark:text-amber-300'
                : 'border-neutral-200 text-neutral-400 dark:border-neutral-700'
            )}
          >
            {isDragOver ? '松开放回待安排' : '所有活动已加入待办'}
          </p>
        )}
      </div>
    </div>
  )
}

const TODO_FILTER_LABELS: Record<Todo['status'], string> = {
  active: '进行中', pending: '待开始', blocked: '阻塞', done: '已完成', cancelled: '已取消',
}

function TodoWorkspacePanel({
  pending,
  todos,
  dragProps,
  actions,
}: {
  pending: { id: string; title: string; day: number; hour: number }[]
  todos: Todo[]
  dragProps: {
    isDragOver: boolean
    onDragOver: (event: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (event: React.DragEvent) => void
  }
  actions: Pick<ReturnType<typeof useTodoStore.getState>, 'addPending' | 'removePending'>
}) {
  const [mode, setMode] = useState<'pending' | 'all'>('pending')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Todo['status'] | 'all'>('all')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return todos.filter((todo) => {
      if (status !== 'all' && todo.status !== status) return false
      return !needle || `${todo.title}\n${todo.description}\n${todo.content}`.toLowerCase().includes(needle)
    })
  }, [todos, query, status])

  return (
    <aside className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-card p-3" aria-label="Todo 待安排与筛选">
      <div className="mb-3 grid grid-cols-2 rounded-md bg-muted p-1" role="tablist" aria-label="Todo 工作区视图">
        <button type="button" role="tab" aria-selected={mode === 'pending'} onClick={() => setMode('pending')} className={cn('rounded px-2 py-1.5 text-xs font-medium', mode === 'pending' && 'bg-background shadow-sm')}>
          待安排 · {pending.length}
        </button>
        <button type="button" role="tab" aria-selected={mode === 'all'} onClick={() => setMode('all')} className={cn('rounded px-2 py-1.5 text-xs font-medium', mode === 'all' && 'bg-background shadow-sm')}>
          全部与筛选 · {todos.length}
        </button>
      </div>
      {mode === 'pending' ? (
        <PendingPanel pending={pending} embedded {...dragProps} {...actions} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、描述或进度" className="h-8 text-xs" />
          <select value={status} onChange={(event) => setStatus(event.target.value as Todo['status'] | 'all')} className="h-8 rounded-md border bg-background px-2 text-xs">
            <option value="all">全部状态</option>
            {Object.entries(TODO_FILTER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground">{filtered.length} / {todos.length} 项</p>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {filtered.map((todo) => (
              <li key={todo.id} className="rounded-md border px-2.5 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn('font-medium', todo.status === 'cancelled' && 'line-through')}>{todo.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{TODO_FILTER_LABELS[todo.status]}</span>
                </div>
                {todo.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{todo.description}</p>}
              </li>
            ))}
            {filtered.length === 0 && <li className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">没有匹配的 Todo</li>}
          </ul>
        </div>
      )}
    </aside>
  )
}

export default function WeekPlanPage() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [now, setNow] = useState(() => Date.now())
  const [activeDayIndex, setActiveDayIndex] = useState(() => new Date().getDay())
  const [isTodoDragOver, setIsTodoDragOver] = useState(false)
  const [isPendingDragOver, setIsPendingDragOver] = useState(false)
  const [allTodos, setAllTodos] = useState<Todo[]>([])

  const weekStart = formatWeekStartClient(weekAnchor)
  const isLoading = useTodoStore((s) => s.isLoading)
  const loadError = useTodoStore((s) => s.error)
  const loadWeek = useTodoStore((s) => s.loadWeek)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const visible = getVisibleWeekDayTabs(weekAnchor)
    if (!visible.some((t) => t.dayIndex === activeDayIndex)) {
      const fallback = visible[visible.length - 1]?.dayIndex ?? weekAnchor.getDay()
      setActiveDayIndex(fallback)
    }
  }, [weekAnchor, activeDayIndex])

  useEffect(() => {
    void loadWeek(weekStart)
  }, [weekStart, loadWeek])

  const pending = useTodoStore((s) => s.pending)
  const todos = useTodoStore((s) => s.todos)
  const todoVersionKey = todos.map((todo) => `${todo.id}:${todo.version}`).join('|')
  const pendingVersionKey = pending.map((todo) => `${todo.id}:${todo.title}:${todo.day}`).join('|')
  const draggingPayload = useTodoStore((s) => s.draggingPayload)
  const setDraggingPayload = useTodoStore((s) => s.setDraggingPayload)
  const addTodoFromDrop = useTodoStore((s) => s.addTodoFromDrop)
  const moveTodoBackToPending = useTodoStore((s) => s.moveTodoBackToPending)
  const startTodo = useTodoStore((s) => s.startTodo)
  const completeTodo = useTodoStore((s) => s.completeTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const addTodoTree = useTodoStore((s) => s.addTodoTree)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const addSubtask = useTodoStore((s) => s.addSubtask)
  const addPending = useTodoStore((s) => s.addPending)
  const removePending = useTodoStore((s) => s.removePending)

  const refreshAllTodos = useCallback(() => {
    fetch('/api/todos', { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || 'Todo 加载失败')
        setAllTodos(result.data)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refreshAllTodos()
  }, [todoVersionKey, pendingVersionKey, refreshAllTodos])

  const yearWeekLabel = useMemo(() => getYearWeekLabel(weekAnchor), [weekAnchor])

  const goPrevWeek = () => {
    const nextStart = shiftWeekStart(weekStart, -1)
    const [y, m, d] = nextStart.split('-').map(Number)
    setWeekAnchor(new Date(y, m - 1, d))
  }

  const goNextWeek = () => {
    const nextStart = shiftWeekStart(weekStart, 1)
    const [y, m, d] = nextStart.split('-').map(Number)
    setWeekAnchor(new Date(y, m - 1, d))
  }

  const goCurrentWeek = () => {
    setWeekAnchor(new Date())
    setActiveDayIndex(new Date().getDay())
  }

  const selectWeek = useCallback((selectedWeekStart: string) => {
    const [year, month, day] = selectedWeekStart.split('-').map(Number)
    setWeekAnchor(new Date(year, month - 1, day))
    const currentWeekStart = formatWeekStartClient(new Date())
    setActiveDayIndex(selectedWeekStart === currentWeekStart ? new Date().getDay() : 0)
  }, [])

  const isCurrentWeek =
    formatWeekStartClient(new Date()) === weekStart

  const handleTodoDragOver = useCallback(
    (e: React.DragEvent) => {
      const payload = draggingPayload
      if (!hasActivityDragPayload(e.dataTransfer) && !payload) return
      if (payload?.source === 'todo') return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsTodoDragOver(true)
    },
    [draggingPayload]
  )

  const handleTodoDragLeave = useCallback(() => {
    setIsTodoDragOver(false)
  }, [])

  const handleTodoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsTodoDragOver(false)
      const payload = parseActivityDragPayload(e.dataTransfer) ?? draggingPayload
      if (!payload || payload.source !== 'pending') return
      addTodoFromDrop(payload, activeDayIndex)
      setDraggingPayload(null)
    },
    [activeDayIndex, addTodoFromDrop, draggingPayload, setDraggingPayload]
  )

  const handlePendingDragOver = useCallback(
    (e: React.DragEvent) => {
      const payload = draggingPayload
      if (!hasActivityDragPayload(e.dataTransfer) && !payload) return
      if (payload?.source === 'pending') return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsPendingDragOver(true)
    },
    [draggingPayload]
  )

  const handlePendingDragLeave = useCallback(() => {
    setIsPendingDragOver(false)
  }, [])

  const handlePendingDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsPendingDragOver(false)
      const payload = parseActivityDragPayload(e.dataTransfer) ?? draggingPayload
      if (!payload || payload.source !== 'todo') return
      moveTodoBackToPending(payload.id)
      setDraggingPayload(null)
    },
    [draggingPayload, moveTodoBackToPending, setDraggingPayload]
  )

  return (
    <div className="mx-auto max-w-[90rem] p-4 sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← 返回 Navi</Link>
        <span className="h-3 w-px bg-border" />
        <h1 className="text-sm font-semibold">Todo 中心</h1>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {loadError}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => void loadWeek(weekStart)}
          >
            重试
          </button>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-9rem)] gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="order-2 grid content-start gap-3 sm:grid-cols-2 xl:order-1 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:grid-cols-1 xl:overflow-y-auto" aria-label="Todo 时间与周视图">
          <TodoTimelineCalendar todos={allTodos} compact selectedWeekStart={weekStart} onWeekSelect={selectWeek} />
          <TodoActivityView todos={allTodos} compact selectedWeekStart={weekStart} onWeekSelect={selectWeek} />
        </aside>

        <section className="order-1 flex min-h-0 min-w-0 flex-col xl:order-2" aria-label="周计划与 Todo 工作区">
          <div className="grid min-h-[38rem] flex-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.8fr)]">
          <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-3 flex min-h-16 flex-wrap items-start justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-sm font-semibold">周计划与执行</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">安排到具体日期，然后进入执行</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevWeek}
                aria-label="上一周"
                className="flex size-8 items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-24 text-center text-sm font-medium">{yearWeekLabel}</span>
              <button
                type="button"
                onClick={goNextWeek}
                aria-label="下一周"
                className="flex size-8 items-center justify-center rounded-md border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <ChevronRight className="size-4" />
              </button>
              {!isCurrentWeek && (
                <button
                  type="button"
                  onClick={goCurrentWeek}
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  回到本周
                </button>
              )}
            </div>
            {isLoading && (
              <span className="text-xs text-muted-foreground">加载中…</span>
            )}
          </div>
          <TodoList
            todos={todos}
            now={now}
            weekAnchor={weekAnchor}
            activeDayIndex={activeDayIndex}
            onActiveDayChange={setActiveDayIndex}
            isDragOver={isTodoDragOver}
            onDragOver={handleTodoDragOver}
            onDragLeave={handleTodoDragLeave}
            onDrop={handleTodoDrop}
            actions={{ startTodo, completeTodo, removeTodo, addTodoTree, updateTodo, addSubtask }}
          />
        </div>
          <TodoWorkspacePanel
            pending={pending}
            todos={allTodos}
            dragProps={{
              isDragOver: isPendingDragOver,
              onDragOver: handlePendingDragOver,
              onDragLeave: handlePendingDragLeave,
              onDrop: handlePendingDrop,
            }}
            actions={{ addPending, removePending }}
          />
          </div>
        </section>
      </div>
      </div>
  )
}
