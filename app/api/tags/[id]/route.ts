import { NextRequest, NextResponse } from 'next/server'
import { deleteTag, getTag, updateTag } from '@/backstage/todo/tag.service'

type Context = { params: Promise<{ id: string }> }

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Tag request failed'
}

function statusOf(error: unknown) {
  return message(error).includes('不存在') ? 404 : 400
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    return NextResponse.json({ success: true, data: await getTag((await context.params).id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const body = await request.json() as { name?: string }
    const tag = await updateTag((await context.params).id, String(body.name ?? ''))
    return NextResponse.json({ success: true, data: tag })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  try {
    await deleteTag((await context.params).id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}
