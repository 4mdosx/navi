import { NextResponse } from 'next/server'

import { resetAgentPresetConfigsToDefault } from '@/backstage/agent/agent-config'
import { requireAgentApiAuth } from '@/backstage/service/agent-auth-guard'

export const runtime = 'nodejs'

export async function POST() {
  const auth = await requireAgentApiAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await resetAgentPresetConfigsToDefault()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset presets'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
