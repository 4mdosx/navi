import { NextResponse } from 'next/server'

import { abortCursorAgentSession } from '@/backstage/agent/cursor-agent.runner'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const result = await abortCursorAgentSession(id)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message ?? 'Abort failed' },
        { status: result.message === 'Session not found' ? 404 : 400 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/agent/sessions/[id]/abort] POST', error)
    return NextResponse.json({ error: 'Failed to abort session' }, { status: 500 })
  }
}
