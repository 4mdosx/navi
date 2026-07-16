import { NextRequest, NextResponse } from 'next/server'
import { getLlmInteractionLogById } from '@/backstage/llm/llm-interaction-log.service'
import {
  ParseTodoCopilotError,
  parseTodoCopilot,
} from '@/backstage/week-plan/parse-todo-copilot'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const log = await getLlmInteractionLogById(id)
  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, log })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const dayLabel = typeof body.dayLabel === 'string' ? body.dayLabel : undefined

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const result = await parseTodoCopilot({ text, dayLabel })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error parsing todo copilot:', error)
    if (error instanceof ParseTodoCopilotError) {
      const status = error.message.includes('ZHIPU_API_KEY') ? 503 : 422
      return NextResponse.json(
        { error: error.message, logId: error.logId },
        { status }
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to parse todo'
    const status = message.includes('ZHIPU_API_KEY') ? 503 : 422
    return NextResponse.json({ error: message }, { status })
  }
}
