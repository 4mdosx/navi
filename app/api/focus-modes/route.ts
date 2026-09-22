import { NextRequest, NextResponse } from 'next/server'
import { createFocusMode, listFocusModes } from '@/backstage/todo/focus-mode.service'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Focus mode request failed'
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await listFocusModes() })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const mode = await createFocusMode(await request.json())
    return NextResponse.json({ success: true, data: mode }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}
