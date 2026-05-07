import { NextResponse } from 'next/server'

import {
  createAgentPresetConfig,
  getAgentCatalog,
  listAgentChoices,
} from '@/backstage/agent/agent-config'
import {
  agentPresetBodySchema,
  type AgentPresetChoiceDto,
  type AgentPresetDto,
} from '@/backstage/agent/session.types'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const catalog = await getAgentCatalog()
    const agents: AgentPresetChoiceDto[] = await listAgentChoices()
    const presets: AgentPresetDto[] = catalog.presets.map((p) => ({
      id: p.id,
      label: p.label,
      runtime: p.runtime,
      promptPrefix: p.promptPrefix ?? '',
      ...(p.local ? { local: { cwd: p.local.cwd } } : {}),
    }))
    return NextResponse.json({
      defaultAgent: catalog.defaultAgentId,
      agents,
      presets,
    })
  } catch (error) {
    console.error('[api/agent/config] GET', error)
    return NextResponse.json({ error: 'Failed to load agent config' }, { status: 500 })
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

  const parsed = agentPresetBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    await createAgentPresetConfig(parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
