import { NextRequest, NextResponse } from 'next/server'
import {
  addTrackerToWeekPending,
  createTrackerItem,
  deleteTrackerItem,
  listDueTrackerItems,
  listTrackerItems,
  updateTrackerItem,
} from '@/backstage/tracker/tracker.service'
import type { TrackerCadence, TrackerKind, TrackerStatus } from '@/types/tracker'

export async function GET(request: NextRequest) {
  try {
    const dueOnly = request.nextUrl.searchParams.get('due') === '1'
    const items = dueOnly ? await listDueTrackerItems() : await listTrackerItems()
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error listing tracker items:', error)
    return NextResponse.json({ error: 'Failed to list tracker items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, title, kind, cadence, notes } = body

    if (action === 'addToWeek') {
      const { id } = body
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'id is required' }, { status: 400 })
      }
      const result = await addTrackerToWeekPending(id)
      return NextResponse.json({ success: true, ...result })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const item = await createTrackerItem({
      title,
      kind: kind as TrackerKind | undefined,
      cadence: cadence as TrackerCadence | undefined,
      notes: notes != null ? String(notes) : undefined,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error creating tracker item:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to create tracker item' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, kind, status, cadence, notes, touch } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const item = await updateTrackerItem(id, {
      title: title != null ? String(title) : undefined,
      kind: kind as TrackerKind | undefined,
      status: status as TrackerStatus | undefined,
      cadence: cadence as TrackerCadence | undefined,
      notes: notes != null ? String(notes) : undefined,
      touch: touch === true,
    })
    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error updating tracker item:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update tracker item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await deleteTrackerItem(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tracker item:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete tracker item' }, { status: 500 })
  }
}
