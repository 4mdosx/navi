'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Focus, Hash, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatHashtag, INCLUDE_ALL, normalizeTagName, type FocusMode, type Tag } from '@/types/tag'
import type { Todo } from '@/types/todo'
import { useMenuOpen } from './todo-status'
import { useTagWorkspace } from './tag-workspace'

function HashtagChip({
  name,
  onRemove,
  muted,
}: {
  name: string
  onRemove?: () => void
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
        muted
          ? 'bg-muted text-muted-foreground'
          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
      )}
    >
      <span className="truncate">{formatHashtag(name)}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`移除 ${formatHashtag(name)}`}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove()
          }}
          className="rounded-full p-0.5 text-current/70 hover:bg-sky-500/15 hover:text-current"
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  )
}

export function TagManagerButton({ onChanged }: { onChanged?: () => void }) {
  const { tags, createTag, updateTag, deleteTag } = useTagWorkspace()
  const { open, setOpen, rootRef } = useMenuOpen()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setDraft('')
    setEditingId(null)
    setEditingName('')
    setError(null)
  }

  const add = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await createTag(draft)
      setDraft('')
      onChanged?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async (id: string) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await updateTag(id, editingName)
      setEditingId(null)
      setEditingName('')
      onChanged?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (tag: Tag) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await deleteTag(tag.id)
      if (editingId === tag.id) {
        setEditingId(null)
        setEditingName('')
      }
      onChanged?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 gap-1 px-2 text-[11px]"
        onClick={() => {
          setOpen((current) => {
            if (current) reset()
            return !current
          })
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Hash className="size-3.5" />
        标签
        {tags.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
            {tags.length}
          </span>
        )}
      </Button>
      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-1 w-64 rounded-md border bg-background p-2 shadow-md">
          <p className="mb-1.5 px-1 text-[10px] text-muted-foreground">管理标签，任务详情里用 #hashtag 添加。</p>
          {tags.length === 0 ? (
            <p className="rounded-md border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
              还没有标签
            </p>
          ) : (
            <ul className="max-h-52 space-y-0.5 overflow-y-auto">
              {tags.map((tag) => (
                <li key={tag.id} className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/70">
                  {editingId === tag.id ? (
                    <form
                      className="flex min-w-0 flex-1 items-center gap-1"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void saveEdit(tag.id)
                      }}
                    >
                      <span className="text-[11px] text-sky-600">#</span>
                      <Input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        className="h-6 px-1.5 text-[11px]"
                        autoFocus
                      />
                      <button type="submit" disabled={saving || !editingName.trim()} className="rounded p-0.5 text-sky-700 hover:bg-sky-500/10 disabled:opacity-40">
                        <Check className="size-3" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        {formatHashtag(tag.name)}
                      </span>
                      <button
                        type="button"
                        aria-label={`编辑 ${tag.name}`}
                        onClick={() => {
                          setEditingId(tag.id)
                          setEditingName(tag.name)
                          setError(null)
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={`删除 ${tag.name}`}
                        onClick={() => void remove(tag)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-2 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault()
              void add()
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="#新标签"
              className="h-7 text-[11px]"
            />
            <Button type="submit" size="sm" className="h-7 px-2 text-[11px]" disabled={saving || !draft.trim()}>
              添加
            </Button>
          </form>
          {error && <p className="mt-1.5 px-1 text-[10px] text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}

export function TodoHashtags({
  todo,
  onChanged,
}: {
  todo: Todo
  onChanged: () => void
}) {
  const { tags, addTodoTag, removeTodoTag } = useTagWorkspace()
  const assigned = todo.tags ?? []
  const assignedIds = new Set(assigned.map((tag) => tag.id))
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const suggestions = useMemo(() => {
    const needle = draft.trim().replace(/^#+/, '').toLowerCase()
    return tags
      .filter((tag) => !assignedIds.has(tag.id))
      .filter((tag) => !needle || tag.name.toLowerCase().includes(needle))
      .slice(0, 8)
  }, [tags, assignedIds, draft])

  const attach = async (input: { name?: string; tagId?: string }) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await addTodoTag(todo.id, input)
      setDraft('')
      setOpen(false)
      onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '添加标签失败')
    } finally {
      setSaving(false)
    }
  }

  const submitDraft = async () => {
    const name = draft.trim()
    if (!name) return
    try {
      const normalized = normalizeTagName(name)
      const existing = tags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase())
      if (existing && assignedIds.has(existing.id)) {
        setDraft('')
        setOpen(false)
        return
      }
      await attach(existing ? { tagId: existing.id } : { name: normalized })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '添加标签失败')
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1">
        {assigned.map((tag) => (
          <HashtagChip
            key={tag.id}
            name={tag.name}
            onRemove={() => {
              void removeTodoTag(todo.id, tag.id).then(onChanged).catch((cause) => {
                setError(cause instanceof Error ? cause.message : '移除标签失败')
              })
            }}
          />
        ))}
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault()
            void submitDraft()
          }}
        >
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setOpen(true)
              setError(null)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            placeholder="#添加"
            className="h-6 w-20 bg-transparent px-1 text-[11px] font-medium text-sky-700 outline-none placeholder:text-sky-700/50 dark:text-sky-300 dark:placeholder:text-sky-300/50"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-36 rounded-md border bg-background p-1 shadow-md">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void attach({ tagId: tag.id })}
                  className="flex w-full items-center rounded px-2 py-1 text-left text-[11px] font-medium text-sky-700 hover:bg-muted dark:text-sky-300"
                >
                  {formatHashtag(tag.name)}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
      {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
    </div>
  )
}

type FocusDraft = {
  name: string
  includeAll: boolean
  includeIds: string[]
  excludeIds: string[]
}

function modeToDraft(mode?: FocusMode | null): FocusDraft {
  return {
    name: mode?.name ?? '',
    includeAll: !mode || mode.includeTags.includes(INCLUDE_ALL),
    includeIds: (mode?.includeTags ?? []).filter((id) => id !== INCLUDE_ALL),
    excludeIds: mode?.excludeTags ?? [],
  }
}

function TagChecklist({
  tags,
  selected,
  onToggle,
  disabled,
}: {
  tags: Tag[]
  selected: string[]
  onToggle: (id: string) => void
  disabled?: boolean
}) {
  if (tags.length === 0) {
    return <p className="text-[10px] text-muted-foreground">还没有标签</p>
  }
  return (
    <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
      {tags.map((tag) => {
        const checked = selected.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(tag.id)}
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              checked
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground',
              disabled && 'opacity-40',
            )}
          >
            {formatHashtag(tag.name)}
          </button>
        )
      })}
    </div>
  )
}

function FocusModeForm({
  title,
  initial,
  tags,
  saving,
  onCancel,
  onSubmit,
}: {
  title: string
  initial?: FocusMode | null
  tags: Tag[]
  saving: boolean
  onCancel: () => void
  onSubmit: (input: { name: string; includeTags: string[]; excludeTags: string[] }) => Promise<void>
}) {
  const [draft, setDraft] = useState<FocusDraft>(() => modeToDraft(initial))
  const [error, setError] = useState<string | null>(null)

  const toggle = (key: 'includeIds' | 'excludeIds', id: string) => {
    setDraft((current) => {
      const next = new Set(current[key])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...current, [key]: [...next] }
    })
  }

  return (
    <form
      className="space-y-2 rounded-md border p-2"
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        void onSubmit({
          name: draft.name.trim(),
          includeTags: draft.includeAll ? [INCLUDE_ALL] : draft.includeIds,
          excludeTags: draft.excludeIds,
        }).catch((cause) => {
          setError(cause instanceof Error ? cause.message : '保存失败')
        })
      }}
    >
      <p className="text-[11px] font-medium">{title}</p>
      <Input
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        placeholder="专注模式名称"
        className="h-7 text-[11px]"
        autoFocus
      />
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium">Include 包含</p>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.includeAll}
              onChange={(event) => setDraft((current) => ({ ...current, includeAll: event.target.checked }))}
              className="size-3 accent-primary"
            />
            *
          </label>
        </div>
        <TagChecklist
          tags={tags}
          selected={draft.includeIds}
          disabled={draft.includeAll}
          onToggle={(id) => toggle('includeIds', id)}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-medium">Exclude 排除</p>
        <TagChecklist
          tags={tags}
          selected={draft.excludeIds}
          onToggle={(id) => toggle('excludeIds', id)}
        />
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <div className="flex justify-end gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" size="sm" className="h-7 px-2 text-[11px]" disabled={saving || !draft.name.trim()}>
          保存
        </Button>
      </div>
    </form>
  )
}

function modeSummary(mode: FocusMode, tags: Tag[]) {
  const names = new Map(tags.map((tag) => [tag.id, tag.name]))
  const include = mode.includeTags.includes(INCLUDE_ALL)
    ? '*'
    : mode.includeTags.map((id) => formatHashtag(names.get(id) ?? id)).join(' ') || '—'
  const exclude = mode.excludeTags.map((id) => formatHashtag(names.get(id) ?? id)).join(' ')
  return exclude ? `include ${include} · exclude ${exclude}` : `include ${include}`
}

export function FocusModeTool({ closeWhen }: { closeWhen?: boolean }) {
  const {
    tags,
    focusModes,
    activeFocusModeId,
    activeFocusMode,
    setActiveFocusModeId,
    createFocusMode,
    updateFocusMode,
    deleteFocusMode,
  } = useTagWorkspace()
  const { open, setOpen, rootRef } = useMenuOpen()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (closeWhen) {
      setOpen(false)
      setEditingId(null)
    }
  }, [closeWhen, setOpen])

  return (
    <div ref={rootRef} className="relative mt-0.5 w-10">
      <button
        type="button"
        aria-pressed={open || Boolean(activeFocusMode)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={activeFocusMode ? `情景：${activeFocusMode.name}` : '情景模式'}
        onClick={() => {
          setOpen((current) => !current)
          if (open) setEditingId(null)
        }}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-md px-0.5 py-2 text-[10px] font-medium leading-none transition-colors',
          open || activeFocusMode
            ? 'bg-muted text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Focus className="size-3.5" />
        <span className="[writing-mode:vertical-rl] tracking-[0.2em]">情景</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="情景模式"
          className="absolute left-full top-0 z-50 ml-2 w-80 rounded-lg border bg-background p-3 shadow-xl"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">情景模式</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {activeFocusMode ? `当前：${activeFocusMode.name}` : '未启用专注过滤'}
              </p>
            </div>
            <button
              type="button"
              className="h-6 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setEditingId('new')}
            >
              <Plus className="mr-0.5 inline size-3" />
              新建
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveFocusModeId(null)}
            className={cn(
              'mb-1.5 flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-[11px]',
              !activeFocusModeId ? 'border-primary/40 bg-primary/5 font-medium' : 'hover:bg-muted',
            )}
          >
            <span>不限制</span>
            <span className="text-[10px] text-muted-foreground">include *</span>
          </button>

          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {focusModes.map((mode) => (
              <div key={mode.id} className="rounded-md border">
                <div className="flex items-start gap-1 p-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveFocusModeId(mode.id === activeFocusModeId ? null : mode.id)}
                    className="min-w-0 flex-1 rounded px-1 py-0.5 text-left hover:bg-muted/60"
                  >
                    <p className={cn('truncate text-[11px]', mode.id === activeFocusModeId && 'font-semibold')}>
                      {mode.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{modeSummary(mode, tags)}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`编辑 ${mode.name}`}
                    onClick={() => setEditingId(mode.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${mode.name}`}
                    onClick={() => void deleteFocusMode(mode.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                {editingId === mode.id && (
                  <div className="border-t p-1.5">
                    <FocusModeForm
                      title="编辑专注模式"
                      initial={mode}
                      tags={tags}
                      saving={saving}
                      onCancel={() => setEditingId(null)}
                      onSubmit={async (input) => {
                        setSaving(true)
                        try {
                          await updateFocusMode(mode.id, input)
                          setEditingId(null)
                        } finally {
                          setSaving(false)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            {focusModes.length === 0 && editingId !== 'new' && (
              <p className="rounded-md border border-dashed px-2 py-4 text-center text-[11px] text-muted-foreground">
                还没有专注模式。默认 include *，也可按标签包含或排除。
              </p>
            )}
          </div>

          {editingId === 'new' && (
            <div className="mt-2">
              <FocusModeForm
                title="新建专注模式"
                tags={tags}
                saving={saving}
                onCancel={() => setEditingId(null)}
                onSubmit={async (input) => {
                  setSaving(true)
                  try {
                    const created = await createFocusMode(input)
                    setActiveFocusModeId(created.id)
                    setEditingId(null)
                  } finally {
                    setSaving(false)
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
