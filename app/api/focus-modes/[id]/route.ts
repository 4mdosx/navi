import { NextRequest, NextResponse } from 'next/server'
import { deleteFocusMode, getFocusMode, updateFocusMode } from '@/backstage/todo/focus-mode.service'

type Context = { params: Promise<{ id: string }> }

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Focus mode request failed'
}

function statusOf(error: unknown) {
  return message(error).includes('不存在') ? 404 : 400
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    return NextResponse.json({ success: true, data: await getFocusMode((await context.params).id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const mode = await updateFocusMode((await context.params).id, await request.json())
    return NextResponse.json({ success: true, data: mode })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    await deleteFocusMode((await context.params).id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}
