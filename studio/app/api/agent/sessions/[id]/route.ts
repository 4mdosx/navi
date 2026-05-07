import { NextResponse } from 'next/server'

import { getAgentSessionById } from '@/backstage/agent/session.repository'
import type { AgentSessionMetaDto } from '@/backstage/agent/session.types'
import type { AgentSessionRow } from '@/backstage/agent/session.repository'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

function toMeta(row: AgentSessionRow): AgentSessionMetaDto {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    exitCode: row.exitCode,
    sdkRunId: row.sdkRunId,
    sdkAgentId: row.sdkAgentId,
    sdkRuntime: row.sdkRuntime,
    taskParamsJson: row.taskParamsJson,
    createdAt: row.createdAt,
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const row = await getAgentSessionById(id)
    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json(toMeta(row))
  } catch (error) {
    console.error('[api/agent/sessions/[id]] GET', error)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
