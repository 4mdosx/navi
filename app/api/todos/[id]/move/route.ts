import { NextRequest, NextResponse } from 'next/server'
import { moveTodo } from '@/backstage/todo/todo.service'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const data = await moveTodo((await context.params).id, await request.json())
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Todo request failed'
    return NextResponse.json({ success: false, error: message }, { status: 409 })
  }
}
