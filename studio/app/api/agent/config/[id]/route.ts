import { NextResponse } from 'next/server'

import {
  getAgentPresetConfigById,
  removeAgentPresetConfig,
  updateAgentPresetConfig,
} from '@/backstage/agent/agent-config'
import { patchAgentPresetBodySchema } from '@/backstage/agent/session.types'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const existed = await getAgentPresetConfigById(id)
  if (!existed) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchAgentPresetBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    await updateAgentPresetConfig(id, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const existed = await getAgentPresetConfigById(id)
  if (!existed) {
    return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
  }

  try {
    await removeAgentPresetConfig(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete preset'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
