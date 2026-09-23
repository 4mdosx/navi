import { closeDatabase } from './database'
import { setSetting, getSetting, deleteSetting } from '../model/settings.model'
import {
  createTodo, listTodos, updateTodo, deleteTodo, getTodo, importOutline,
} from '../todo/todo.service'
import { createTag, setTodoTags, tagsForTodos } from '../todo/tag.service'
import { createFocusMode, listFocusModes } from '../todo/focus-mode.service'
import { startTodoTimeSpan, stopTodoTimeSpan, listOpenTodoTimeSpans } from '../todo/todo-time-span.service'
import { promoteTodo, getToday, removeFromToday, listExecutionActivity } from '../execution/execution.service'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main() {
  const created = await createTodo({
    title: '写周报',
    description: '周五前发出',
    time: [{ grain: 'week', date: '2026-09-20' }],
  })
  assert(created.status === 'pending', 'new todo is pending')

  const found = await listTodos({ query: '周报' })
  assert(found.some((todo) => todo.id === created.id), 'search finds the todo')

  const renamed = await updateTodo(created.id, { title: '写周报草稿', version: created.version })
  assert(renamed.title === '写周报草稿', 'title updates')
  assert(renamed.version === created.version + 1, 'version increments')

  let conflicted = false
  try {
    await updateTodo(created.id, { title: '冲突', version: created.version })
  } catch (error) {
    conflicted = error instanceof Error && error.message.includes('version conflict')
  }
  assert(conflicted, 'stale version is rejected')

  const child = await createTodo({
    title: '收集数字',
    parentId: created.id,
    time: [{ grain: 'day', date: '2026-09-24' }],
  })
  assert(child.depth === 1, 'child depth is 1')
  assert(child.timeLinks?.some((link) => link.grain === 'week' && link.date === '2026-09-20'), 'child copies the parent week link')
  assert(child.timeLinks?.some((link) => link.grain === 'day' && link.date === '2026-09-24'), 'child keeps its own day link')

  const tag = await createTag('写作')
  await setTodoTags(created.id, [tag.id])
  const tagged = (await tagsForTodos([created.id])).get(created.id) ?? []
  assert(tagged.some((item) => item.id === tag.id), 'tag attaches to the todo')

  const mode = await createFocusMode({ name: '写作', includeTags: [tag.id], excludeTags: [] })
  const modes = await listFocusModes()
  assert(modes.some((item) => item.id === mode.id), 'focus mode is stored')

  await startTodoTimeSpan(created.id)
  assert((await listOpenTodoTimeSpans()).some((span) => span.todoId === created.id), 'open span starts')
  await stopTodoTimeSpan(created.id)
  assert(!(await listOpenTodoTimeSpans()).some((span) => span.todoId === created.id), 'open span stops')

  await promoteTodo(created.id)
  const today = await getToday()
  assert(today.items.some((item) => item.sourceId === created.id), 'todo is on today')
  await removeFromToday(created.id)
  const afterRemove = await getToday()
  assert(!afterRemove.items.some((item) => item.sourceId === created.id && item.state !== 'skipped'), 'todo leaves today')

  const done = await updateTodo(created.id, { status: 'done', version: (await getTodo(created.id)).version })
  assert(done.status === 'done', 'todo can be completed')
  const notes = await listTodos({ parentId: created.id, kind: 'note' })
  assert(notes.some((note) => note.noteType === 'status_change'), 'status change writes a note')

  let blocked = false
  try {
    await deleteTodo(created.id)
  } catch (error) {
    blocked = error instanceof Error && error.message.includes('cascade')
  }
  assert(blocked, 'parent with children requires cascade')

  const outline = await importOutline({
    text: '- 导入的根\n  - 导入的子',
    weekStart: '2026-09-20',
  })
  assert(outline.created.length === 2, 'outline import creates the tree')

  await setSetting('verify', 'ok')
  assert(await getSetting('verify') === 'ok', 'setting round-trips')
  await deleteSetting('verify')
  assert(await getSetting('verify') === null, 'setting deletes')

  const activity = await listExecutionActivity('2026-01-01T00:00:00.000Z')
  assert(Array.isArray(activity), 'execution activity query runs')

  console.log('main flows ok')
}

main()
  .then(() => closeDatabase())
  .catch(async (error) => {
    console.error(error)
    await closeDatabase().catch(() => undefined)
    process.exit(1)
  })
