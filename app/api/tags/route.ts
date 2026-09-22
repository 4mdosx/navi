import { NextRequest, NextResponse } from 'next/server'
import { createTag, listTags } from '@/backstage/todo/tag.service'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Tag request failed'
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await listTags() })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string }
    const tag = await createTag(String(body.name ?? ''))
    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: message(error) }, { status: 400 })
  }
}
