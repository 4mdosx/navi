import { NextRequest, NextResponse } from 'next/server'
import {
  createInboxItem,
  deleteInboxItem,
  listInboxItems,
  updateInboxItem,
} from '@/backstage/inbox/inbox.service'
import type { InboxItemStatus, InboxSource } from '@/types/inbox'

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') as InboxItemStatus | null
    const items = await listInboxItems(status ?? undefined)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error listing inbox items:', error)
    return NextResponse.json({ error: 'Failed to list inbox items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, url, source, notes, tags } = body
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    const item = await createInboxItem({
      title,
      url: url != null ? String(url) : undefined,
      source: source as InboxSource | undefined,
      notes: notes != null ? String(notes) : undefined,
      tags: Array.isArray(tags) ? tags.map(String) : undefined,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error creating inbox item:', error)
    return NextResponse.json({ error: 'Failed to create inbox item' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, url, status, notes, tags } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const item = await updateInboxItem(id, {
      title: title != null ? String(title) : undefined,
      url: url !== undefined ? (url ? String(url) : null) : undefined,
      status: status as InboxItemStatus | undefined,
      notes: notes != null ? String(notes) : undefined,
      tags: Array.isArray(tags) ? tags.map(String) : undefined,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error updating inbox item:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update inbox item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await deleteInboxItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inbox item:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete inbox item' }, { status: 500 })
  }
}
