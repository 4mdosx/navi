import { NextRequest, NextResponse } from 'next/server'
import { getTodo } from '@/backstage/todo/todo.service'
import { attachTodoTagByName, detachTodoTag, setTodoTags } from '@/backstage/todo/tag.service'

type Context = { params: Promise<{ id: string }> }

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Todo tag request failed'
}

function statusOf(error: unknown) {
  const text = message(error)
  return text.includes('not found') || text.includes('不存在') ? 404 : 400
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const id = (await context.params).id
    const body = await request.json() as { tagIds?: string[] }
    await setTodoTags(id, Array.isArray(body.tagIds) ? body.tagIds : [])
    return NextResponse.json({ success: true, data: await getTodo(id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const id = (await context.params).id
    const body = await request.json() as { name?: string; tagId?: string }
    if (body.tagId) {
      const todo = await getTodo(id)
      const next = [...new Set([...(todo.tags ?? []).map((tag) => tag.id), body.tagId])]
      await setTodoTags(id, next)
    } else {
      await attachTodoTagByName(id, String(body.name ?? ''))
    }
    return NextResponse.json({ success: true, data: await getTodo(id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const id = (await context.params).id
    const tagId = request.nextUrl.searchParams.get('tagId')
    if (!tagId) throw new Error('tagId is required')
    await detachTodoTag(id, tagId)
    return NextResponse.json({ success: true, data: await getTodo(id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: statusOf(error) })
  }
}
