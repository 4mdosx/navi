import { NextRequest, NextResponse } from 'next/server'
import { updateTodoContent } from '@/backstage/todo/todo.service'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json()
    const data = await updateTodoContent((await context.params).id, body)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Todo request failed'
    return NextResponse.json({ success: false, error: message }, { status: message.includes('conflict') ? 409 : 400 })
  }
}
