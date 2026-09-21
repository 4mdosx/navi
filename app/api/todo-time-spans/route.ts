import { NextRequest, NextResponse } from 'next/server'
import { getTodo, updateTodo } from '@/backstage/todo/todo.service'
import { listTodoTimeSpans, startTodoTimeSpan, stopTodoTimeSpan } from '@/backstage/todo/todo-time-span.service'
import { isNoteKind } from '@/types/todo'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Time span request failed'
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const spans = await listTodoTimeSpans({
      from: params.get('from') || undefined,
      to: params.get('to') || undefined,
    })
    return NextResponse.json({ success: true, data: spans })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; todoId?: string }
    const todoId = body.todoId?.trim()
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
      if (todo.status !== 'active') await updateTodo(todoId, { status: 'active' })
      else await startTodoTimeSpan(todoId)
    } else {
      throw new Error('Unknown time span action')
    }

    const next = await getTodo(todoId)
    const spans = await listTodoTimeSpans({
      from: request.nextUrl.searchParams.get('from') || undefined,
      to: request.nextUrl.searchParams.get('to') || undefined,
    })
    return NextResponse.json({ success: true, data: { todo: next, spans } })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}
