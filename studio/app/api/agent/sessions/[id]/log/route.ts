import { NextResponse } from 'next/server'

import { agentLogQuerySchema } from '@/backstage/agent/session.types'
import { getAgentSessionById } from '@/backstage/agent/session.repository'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  const raw = Object.fromEntries(searchParams.entries())
  const parsed = agentLogQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { startLine, lineLimit } = parsed.data

  try {
    const row = await getAgentSessionById(id)
    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const logBlob = row.logBlob ?? ''
    const lines = logBlob.length === 0 ? [] : logBlob.split('\n')
    const totalLines = lines.length
    const end = Math.min(startLine + lineLimit, totalLines)
    const slice = lines.slice(startLine, end)
    const text = slice.join('\n')

    const res = {
      text,
      startLine,
      nextStartLine: end,
      totalLines,
      status: row.status,
      exitCode: row.exitCode,
    }

    return NextResponse.json(res, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[api/agent/sessions/[id]/log] GET', error)
    return NextResponse.json({ error: 'Failed to read log' }, { status: 500 })
  }
}
