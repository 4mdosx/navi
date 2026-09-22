import { shiftWeekStart, formatWeekStart, formatDateKey } from '@/backstage/week-plan/week-utils'
import {
  hasTimeLink,
  isCarryTodoStatus,
  isTodayScheduled,
  todoTimeLinks,
  type TimeGrain,
  type Todo,
  type TodoKind,
  type TodoStatus,
} from '@/types/todo'
import { matchesFocusMode, tagIdsOf } from '@/types/tag'

export type OutlineDraft = {
  title: string
  kind: TodoKind
  status: 'pending' | 'done'
  children: OutlineDraft[]
}

type RawNode = {
  title: string
  done: boolean
  bullet: boolean
  children: RawNode[]
}

const SKIP_TITLES = /^(工作计划|周计划|本周计划|本周工作)$/
const DONE_MARK = /(?:☑️|✅|✔️|✔|✓|☑|\[[xX]\])/g
const BULLET = /^[-*•]\s+/

function indentLevel(line: string): number {
  let index = 0
  let level = 0
  while (index < line.length) {
    if (line[index] === '\t') {
      level += 1
      index += 1
      continue
    }
    if (line[index] === ' ') {
      let spaces = 0
      while (line[index] === ' ') {
        spaces += 1
        index += 1
      }
      level += Math.max(1, Math.ceil(spaces / 2))
      continue
    }
    break
  }
  return level
}

function parseLine(line: string): { title: string; done: boolean; bullet: boolean } | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const bullet = BULLET.test(trimmed)
  let title = trimmed.replace(BULLET, '')
  const done = DONE_MARK.test(title)
  DONE_MARK.lastIndex = 0
  title = title.replace(DONE_MARK, '').replace(/\[[ xX]\]/g, '').replace(/\s+/g, ' ').trim()
  if (!title || SKIP_TITLES.test(title)) return null
  return { title, done, bullet }
}

function absorbSameLevelBullets(nodes: RawNode[]): RawNode[] {
  const result: RawNode[] = []
  for (const node of nodes) {
    node.children = absorbSameLevelBullets(node.children)
    const previous = result[result.length - 1]
    if (node.bullet && previous && !previous.bullet && !previous.done) {
      previous.children.push(node)
      continue
    }
    result.push(node)
  }
  return result
}

function parseRawTree(text: string): RawNode[] {
  const roots: RawNode[] = []
  const stack: Array<{ level: number; node: RawNode }> = []

  for (const rawLine of text.split(/\r?\n/)) {
    const parsed = parseLine(rawLine)
    if (!parsed) continue
    const level = indentLevel(rawLine)
    const node: RawNode = { ...parsed, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.node.children.push(node)
    else roots.push(node)
    stack.push({ level, node })
  }
  return absorbSameLevelBullets(roots)
}

function looksLikeNote(title: string): boolean {
  if (/[，。,.]/.test(title)) return true
  if (title.length > 16) return true
  return /(了|先把|看情况|争取|然后|这周)/.test(title)
}

function inferKind(node: RawNode, parent?: RawNode): TodoKind {
  if (node.done) return 'action'
  if (node.bullet) {
    if (parent?.done && !node.done && node.children.length === 0) return 'note'
    return 'action'
  }
  if (node.children.length > 0) return 'action'
  if (looksLikeNote(node.title)) return 'note'
  return 'action'
}

function toDraft(node: RawNode, parent?: RawNode): OutlineDraft {
  return {
    title: node.title,
    kind: inferKind(node, parent),
    status: node.done ? 'done' : 'pending',
    children: node.children.map((child) => toDraft(child, node)),
  }
}

export function parseOutline(text: string): OutlineDraft[] {
  return parseRawTree(text).map((node) => toDraft(node))
}

function localDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return formatDateKey(date)
}

function inWeek(iso: string | null | undefined, weekStart: string): boolean {
  const key = localDateKey(iso)
  if (!key) return false
  const weekEnd = shiftWeekStart(weekStart, 1)
  return key >= weekStart && key < weekEnd
}

function belongsToWeek(todo: Todo, weekStart: string): boolean {
  return hasTimeLink(todo, 'week', weekStart)
    || todoTimeLinks(todo).some((link) => link.grain === 'day' && inWeek(link.date, weekStart))
}

export function selectWeekOutline(todos: Todo[], weekStart: string): Todo[] {
  const list = todos.filter(Boolean).map((todo) => ({ ...todo, timeLinks: todoTimeLinks(todo) }))
  const byId = new Map(list.map((todo) => [todo.id, todo]))
  const weekEnd = shiftWeekStart(weekStart, 1)
  const isCurrentWeek = weekStart === formatWeekStart(new Date())
  const visible = new Set<string>()

  for (const todo of list) {
    if (todo.kind === 'note' || todo.kind === 'rest') continue
    const createdKey = localDateKey(todo.createdAt)
    if (createdKey && createdKey >= weekEnd) continue

    const createdInWeek = inWeek(todo.createdAt, weekStart)
    if (createdInWeek) {
      visible.add(todo.id)
      continue
    }

    if (todo.status === 'done') {
      if (inWeek(todo.completedAt ?? todo.updatedAt, weekStart)) visible.add(todo.id)
      continue
    }

    if (!isCarryTodoStatus(todo.status)) continue
    if (isCurrentWeek || belongsToWeek(todo, weekStart)) visible.add(todo.id)
  }

  withAncestors(list, visible, byId)
  return withNotesOfVisible(list, visible)
}

export function filterOutlineByStatuses(todos: Todo[], statuses: ReadonlySet<TodoStatus>): Todo[] {
  const list = todos.filter(Boolean)
  if (statuses.size === 0) return []
  const byId = new Map(list.map((todo) => [todo.id, todo]))
  const visible = new Set<string>()
  for (const todo of list) {
    if (todo.kind === 'note' || todo.kind === 'rest') continue
    if (statuses.has(todo.status)) visible.add(todo.id)
  }
  withAncestors(list, visible, byId)
  return withNotesOfVisible(list, visible)
}

function branchTagIds(todo: Todo, byId: Map<string, Todo>): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  let current: Todo | undefined = todo
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    ids.push(...tagIdsOf(current))
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return ids
}

function excludedByBranch(
  todo: Todo,
  byId: Map<string, Todo>,
  excludeTags: readonly string[],
): boolean {
  if (excludeTags.length === 0) return false
  const exclude = new Set(excludeTags)
  return branchTagIds(todo, byId).some((id) => exclude.has(id))
}

export function filterOutlineByFocusMode(todos: Todo[], mode?: Parameters<typeof matchesFocusMode>[1]): Todo[] {
  if (!mode) return todos
  const list = todos.filter(Boolean)
  const byId = new Map(list.map((todo) => [todo.id, todo]))
  const visible = new Set<string>()
  for (const todo of list) {
    if (todo.kind === 'note' || todo.kind === 'rest') continue
    if (matchesFocusMode(branchTagIds(todo, byId), mode)) visible.add(todo.id)
  }
  for (const id of [...visible]) {
    let parentId = byId.get(id)?.parentId
    const seen = new Set<string>()
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent || excludedByBranch(parent, byId, mode.excludeTags)) break
      visible.add(parent.id)
      parentId = parent.parentId
    }
  }
  for (const todo of list) {
    if (todo.kind !== 'note' || !todo.parentId || !visible.has(todo.parentId)) continue
    if (matchesFocusMode(branchTagIds(todo, byId), mode)) visible.add(todo.id)
  }
  return list.filter((todo) => visible.has(todo.id))
}

export function selectLinkedOutline(todos: Todo[], grain: TimeGrain, date?: string): Todo[] {
  const list = todos.filter(Boolean).map((todo) => ({ ...todo, timeLinks: todoTimeLinks(todo) }))
  const byId = new Map(list.map((todo) => [todo.id, todo]))
  const visible = new Set<string>()
  for (const todo of list) {
    if (todo.kind === 'rest') continue
    if (todo.status === 'cancelled') continue
    if (hasTimeLink(todo, grain, date)) visible.add(todo.id)
  }
  return withAncestorsAndNotes(list, visible, byId)
}

export function selectTimeOutline(todos: Todo[], grain: TimeGrain, date: string): Todo[] {
  if (grain === 'week') return selectWeekOutline(todos, date)
  if (grain === 'day') return selectTodayOutline(todos, date)
  return selectLinkedOutline(todos, grain, grain === 'horizon' ? undefined : date)
}

export function todayScheduledIds(todos: Todo[], todayKey: string): Set<string> {
  const ids = new Set<string>()
  for (const todo of todos) {
    if (isTodayScheduled(todo, todayKey)) ids.add(todo.id)
  }
  return ids
}

export function todayOperableIds(todos: Todo[], scheduledIds: ReadonlySet<string>): Set<string> {
  const ids = new Set(scheduledIds)
  const childrenOf = new Map<string, string[]>()
  for (const todo of todos) {
    if (!todo.parentId || todo.kind === 'note' || todo.kind === 'rest') continue
    const list = childrenOf.get(todo.parentId) ?? []
    list.push(todo.id)
    childrenOf.set(todo.parentId, list)
  }
  const walk = (parentId: string) => {
    for (const childId of childrenOf.get(parentId) ?? []) {
      if (ids.has(childId)) continue
      ids.add(childId)
      walk(childId)
    }
  }
  for (const id of scheduledIds) walk(id)
  return ids
}

export function selectTodayOutline(todos: Todo[], todayKey: string): Todo[] {
  const list = todos.filter(Boolean).map((todo) => ({ ...todo, timeLinks: todoTimeLinks(todo) }))
  const byId = new Map(list.map((todo) => [todo.id, todo]))
  const seeds = todayScheduledIds(list, todayKey)
  const visible = new Set<string>(seeds)

  for (const id of seeds) {
    const todo = byId.get(id)
    if (!todo) continue
    if (todo.parentId && byId.has(todo.parentId)) visible.add(todo.parentId)
    if (todo.parentId) {
      for (const sibling of list) {
        if (
          sibling.parentId === todo.parentId
          && sibling.kind !== 'note'
          && sibling.kind !== 'rest'
          && sibling.status !== 'cancelled'
        ) {
          visible.add(sibling.id)
        }
      }
    }
    const addDescendants = (parentId: string, seen: Set<string>) => {
      for (const child of list) {
        if (child.parentId !== parentId || child.status === 'cancelled' || seen.has(child.id)) continue
        seen.add(child.id)
        visible.add(child.id)
        addDescendants(child.id, seen)
      }
    }
    addDescendants(id, new Set([id]))
  }

  return withNotesOfVisible(list, visible)
}

function withAncestors(
  todos: Todo[],
  visible: Set<string>,
  byId: Map<string, Todo>,
): Todo[] {
  for (const id of [...visible]) {
    let parentId = byId.get(id)?.parentId
    while (parentId) {
      visible.add(parentId)
      parentId = byId.get(parentId)?.parentId ?? null
    }
  }
  return todos.filter((todo) => visible.has(todo.id))
}

function withNotesOfVisible(todos: Todo[], visible: Set<string>): Todo[] {
  for (const todo of todos) {
    if (todo.kind === 'note' && todo.parentId && visible.has(todo.parentId)) visible.add(todo.id)
  }
  return todos.filter((todo) => visible.has(todo.id))
}

function withAncestorsAndNotes(
  todos: Todo[],
  visible: Set<string>,
  byId: Map<string, Todo>,
): Todo[] {
  withAncestors(todos, visible, byId)
  let added = true
  while (added) {
    added = false
    for (const todo of todos) {
      if (todo.status === 'cancelled') continue
      if (todo.parentId && visible.has(todo.parentId) && !visible.has(todo.id)) {
        visible.add(todo.id)
        added = true
      }
    }
  }
  return todos.filter((todo) => visible.has(todo.id))
}

export type OutlineTreeNode = Todo & { children: OutlineTreeNode[] }

export function buildOutlineTree(todos: Todo[]): OutlineTreeNode[] {
  const nodes = new Map(todos.map((todo) => [todo.id, { ...todo, children: [] as OutlineTreeNode[] }]))
  const roots: OutlineTreeNode[] = []
  const ordered = [...todos].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))

  for (const todo of ordered) {
    const node = nodes.get(todo.id)
    if (!node) continue
    if (todo.parentId && nodes.has(todo.parentId)) nodes.get(todo.parentId)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function outlineRole(todo: Pick<Todo, 'kind'>): 'task' | 'note' {
  if (todo.kind === 'action') return 'task'
  return 'note'
}

export function outlineTaskChildren(node: OutlineTreeNode): OutlineTreeNode[] {
  return node.children.filter((child) => outlineRole(child) === 'task')
}

export function siblingTasks(todos: Todo[], parentId: string | null, excludeId?: string): Todo[] {
  return todos
    .filter((todo) => (todo.parentId ?? null) === parentId && outlineRole(todo) === 'task' && todo.id !== excludeId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
}

export function noteChildrenOf(todos: Todo[], parentId: string): Todo[] {
  return todos
    .filter((todo) => todo.parentId === parentId && outlineRole(todo) === 'note')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.sortOrder - b.sortOrder)
}

export function wouldCreateCycle(todos: Todo[], sourceId: string, newParentId: string | null): boolean {
  if (newParentId == null) return false
  if (newParentId === sourceId) return true
  const byId = new Map(todos.map((todo) => [todo.id, todo]))
  let cursor: string | null = newParentId
  const seen = new Set<string>()
  while (cursor) {
    if (cursor === sourceId || seen.has(cursor)) return true
    seen.add(cursor)
    cursor = byId.get(cursor)?.parentId ?? null
  }
  return false
}

export function hasDescendantTasks(node: OutlineTreeNode): boolean {
  return outlineTaskChildren(node).some((child) => outlineRole(child) === 'task' || hasDescendantTasks(child))
}

export function countOutlineProgress(node: OutlineTreeNode): { done: number; total: number } {
  const tasks = node.children.filter((child) => outlineRole(child) === 'task')
  if (tasks.length === 0) {
    return outlineRole(node) === 'task'
      ? { done: node.status === 'done' ? 1 : 0, total: 1 }
      : { done: 0, total: 0 }
  }
  return tasks.reduce(
    (sum, child) => {
      const progress = countOutlineProgress(child)
      return { done: sum.done + progress.done, total: sum.total + progress.total }
    },
    { done: 0, total: 0 },
  )
}
