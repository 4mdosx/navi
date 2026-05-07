import { after } from 'next/server'
import { NextResponse } from 'next/server'

import {
  assertUnderConcurrencyLimit,
  executeCursorAgentSession,
} from '@/backstage/agent/cursor-agent.runner'
import {
  createAgentSession,
  listAgentSessions,
} from '@/backstage/agent/session.repository'
import { createAgentSessionBodySchema } from '@/backstage/agent/session.types'
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

export async function GET(request: Request) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = searchParams.get('limit')
    const limit = limitRaw
      ? Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200)
      : 50

    const rows = await listAgentSessions({ limit })
    return NextResponse.json(rows.map(toMeta))
  } catch (error) {
    console.error('[api/agent/sessions] GET', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createAgentSessionBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body: prompt required' }, { status: 400 })
  }

  try {
    await assertUnderConcurrencyLimit()
  } catch (e) {
    if (e instanceof Error && (e as Error & { statusCode?: number }).statusCode === 429) {
      return NextResponse.json({ error: e.message }, { status: 429 })
    }
    throw e
  }

  try {
    const id = await createAgentSession({
      taskParams: { prompt: parsed.data.prompt, agent: parsed.data.agent ?? null },
    })

    after(() => {
      void executeCursorAgentSession(id, parsed.data.prompt, parsed.data.agent).catch((err) => {
        console.error('[api/agent/sessions] background run', id, err)
      })
    })

    return NextResponse.json({ id, status: 'running' })
  } catch (error) {
    console.error('[api/agent/sessions] POST', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
