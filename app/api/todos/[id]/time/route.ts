import { NextRequest, NextResponse } from 'next/server'
import { linkTodoTime, unlinkTodoTime } from '@/backstage/todo/todo.service'
import { isTimeGrain } from '@/types/todo'

type Context = { params: Promise<{ id: string }> }

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Todo time link failed'
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const body = await request.json() as { grain?: string; date?: string }
    if (!body.grain || !isTimeGrain(body.grain)) {
      return NextResponse.json({ success: false, error: 'grain must be day, week, or horizon' }, { status: 400 })
    }
    if (!body.date?.trim()) {
      return NextResponse.json({ success: false, error: 'date is required' }, { status: 400 })
    }
    const todo = await linkTodoTime((await context.params).id, body.grain, body.date)
    return NextResponse.json({ success: true, data: todo })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const grain = request.nextUrl.searchParams.get('grain')
    const date = request.nextUrl.searchParams.get('date') || undefined
    if (!grain || !isTimeGrain(grain)) {
      return NextResponse.json({ success: false, error: 'grain must be day, week, or horizon' }, { status: 400 })
    }
    const todo = await unlinkTodoTime((await context.params).id, grain, date)
    return NextResponse.json({ success: true, data: todo })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}
