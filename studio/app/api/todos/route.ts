import { NextRequest, NextResponse } from 'next/server'
import { createTodo, listTodos } from '@/backstage/todo/todo.service'
import type { TodoPlacement, TodoStatus } from '@/types/todo'

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const parent = params.get('parentId')
    const todos = await listTodos({
      placement: (params.get('placement') || undefined) as TodoPlacement | undefined,
      weekStart: params.get('weekStart') || undefined,
      status: (params.get('status') || undefined) as TodoStatus | undefined,
      query: params.get('query') || undefined,
      parentId: parent === 'root' ? null : parent ?? undefined,
    })
    return NextResponse.json({ success: true, data: todos })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const todo = await createTodo(await request.json())
    return NextResponse.json({ success: true, data: todo }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Todo request failed'
}
