import { NextRequest, NextResponse } from 'next/server'
import { importOutline } from '@/backstage/todo/todo.service'
import type { TimeGrain } from '@/types/todo'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      text?: string
      weekStart?: string
      parentId?: string | null
      time?: Array<{ grain: TimeGrain; date: string }>
    }
    if (!body.text?.trim()) {
      return NextResponse.json({ success: false, error: 'text is required' }, { status: 400 })
    }
    const result = await importOutline({
      text: body.text,
      weekStart: body.weekStart,
      parentId: body.parentId,
      time: body.time,
    })
    return NextResponse.json({
      success: true,
      data: {
        created: result.created,
        count: result.created.length,
        roots: result.roots.length,
      },
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Outline import failed',
    }, { status: 400 })
  }
}
