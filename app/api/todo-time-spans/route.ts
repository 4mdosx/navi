import { NextRequest, NextResponse } from 'next/server'
import { ensureRestTodo, findRestTodo, getTodo, updateTodo } from '@/backstage/todo/todo.service'
import { listOpenTodoTimeSpans, listTodoTimeSpans, startTodoTimeSpan, stopTodoTimeSpan } from '@/backstage/todo/todo-time-span.service'
import { isNoteKind, isRestKind } from '@/types/todo'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Time span request failed'
}

function rangeFrom(request: NextRequest) {
  const params = request.nextUrl.searchParams
  return {
    from: params.get('from') || undefined,
    to: params.get('to') || undefined,
    todoId: params.get('todoId') || undefined,
  }
}

async function pauseOpenSpans(exceptTodoId?: string) {
  const open = await listOpenTodoTimeSpans()
  for (const span of open) {
    if (span.todoId === exceptTodoId) continue
    const todo = await getTodo(span.todoId)
    if (todo.status === 'active') await updateTodo(todo.id, { status: 'pending' })
    else await stopTodoTimeSpan(todo.id)
  }
}

async function pauseRestIfOpen(exceptTodoId?: string) {
  const rest = await findRestTodo()
  if (!rest || rest.id === exceptTodoId) return
  const open = await listOpenTodoTimeSpans()
  if (!open.some((span) => span.todoId === rest.id)) return
  if (rest.status === 'active') await updateTodo(rest.id, { status: 'pending' })
  else await stopTodoTimeSpan(rest.id)
}

export async function GET(request: NextRequest) {
  try {
    const spans = await listTodoTimeSpans(rangeFrom(request))
    return NextResponse.json({ success: true, data: spans })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; todoId?: string }
    let todoId = body.todoId?.trim()

    if (body.action === 'rest') {
      const rest = await ensureRestTodo()
      todoId = rest.id
      await pauseOpenSpans(rest.id)
      if (rest.status !== 'active') await updateTodo(rest.id, { status: 'active' })
      else await startTodoTimeSpan(rest.id)
    } else {
      if (!todoId) throw new Error('todoId is required')
      const todo = await getTodo(todoId)
      if (isNoteKind(todo.kind)) throw new Error('备注不能进入工作区')

      if (body.action === 'leave') {
        if (todo.status === 'active') await updateTodo(todoId, { status: 'pending' })
        else await stopTodoTimeSpan(todoId)
      } else if (body.action === 'enter') {
        if (todo.status === 'done' || todo.status === 'cancelled') {
          throw new Error('已结束的任务不能进入工作区')
        }
        if (!isRestKind(todo.kind)) await pauseRestIfOpen(todoId)
        if (todo.status !== 'active') await updateTodo(todoId, { status: 'active' })
        else await startTodoTimeSpan(todoId)
      } else {
        throw new Error('Unknown time span action')
      }
    }

    const next = await getTodo(todoId)
    const spans = await listTodoTimeSpans(rangeFrom(request))
    return NextResponse.json({ success: true, data: { todo: next, spans } })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}
