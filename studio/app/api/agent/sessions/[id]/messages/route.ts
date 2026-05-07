import { after } from 'next/server'
import { NextResponse } from 'next/server'

import { executeCursorAgentFollowUp } from '@/backstage/agent/cursor-agent.runner'
import { appendAgentMessageBodySchema } from '@/backstage/agent/session.types'
import { getAgentSessionById, updateAgentSession } from '@/backstage/agent/session.repository'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = appendAgentMessageBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body: text required' }, { status: 400 })
  }

  const row = await getAgentSessionById(id)
  if (!row) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (row.status === 'running') {
    return NextResponse.json({ error: 'Session is running' }, { status: 409 })
  }
  if (!row.sdkAgentId) {
    return NextResponse.json({ error: 'Session is missing sdkAgentId' }, { status: 400 })
  }

  // Mark as running for this follow-up turn.
  await updateAgentSession(id, { status: 'running', endedAt: null, exitCode: null })

  after(() => {
    void executeCursorAgentFollowUp(id, parsed.data.text).catch((err) => {
      console.error('[api/agent/sessions/[id]/messages] background run', id, err)
    })
  })

  return NextResponse.json({ ok: true, status: 'running' })
}

