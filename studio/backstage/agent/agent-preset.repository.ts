import 'server-only'

import { getDatabase } from '@/backstage/db/database'

export type AgentPresetRow = {
  id: string
  label: string
  runtime: 'local' | 'cloud'
  promptPrefix: string
  localCwd: string | null
  createdAt: string
  updatedAt: string
}

function mapRow(row: {
  id: string
  label: string
  runtime: string
  promptPrefix: string
  localCwd: string | null
  createdAt: string
  updatedAt: string
}): AgentPresetRow {
  return {
    id: row.id,
    label: row.label,
    runtime: row.runtime === 'cloud' ? 'cloud' : 'local',
    promptPrefix: row.promptPrefix,
    localCwd: row.localCwd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listAgentPresets(): Promise<AgentPresetRow[]> {
  const db = await getDatabase()
  const rows = await db
    .selectFrom('agent_presets')
    .selectAll()
    .orderBy('createdAt', 'asc')
    .execute()
  return rows.map(mapRow)
}

export async function getAgentPresetById(id: string): Promise<AgentPresetRow | undefined> {
  const db = await getDatabase()
  const row = await db
    .selectFrom('agent_presets')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  return row ? mapRow(row) : undefined
}

export async function createAgentPreset(input: {
  id: string
  label: string
  runtime: 'local' | 'cloud'
  promptPrefix: string
  localCwd: string | null
}): Promise<void> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db
    .insertInto('agent_presets')
    .values({
      id: input.id,
      label: input.label,
      runtime: input.runtime,
      promptPrefix: input.promptPrefix,
      localCwd: input.localCwd,
      createdAt: now,
      updatedAt: now,
    })
    .execute()
}

export async function updateAgentPreset(
  id: string,
  patch: Partial<{
    label: string
    runtime: 'local' | 'cloud'
    promptPrefix: string
    localCwd: string | null
  }>
): Promise<void> {
  const db = await getDatabase()
  const updates: Partial<{
    label: string
    runtime: 'local' | 'cloud'
    promptPrefix: string
    localCwd: string | null
    updatedAt: string
  }> = {}
  if (patch.label !== undefined) updates.label = patch.label
  if (patch.runtime !== undefined) updates.runtime = patch.runtime
  if (patch.promptPrefix !== undefined) updates.promptPrefix = patch.promptPrefix
  if (patch.localCwd !== undefined) updates.localCwd = patch.localCwd
  if (Object.keys(updates).length === 0) return
  updates.updatedAt = new Date().toISOString()

  await db.updateTable('agent_presets').set(updates).where('id', '=', id).execute()
}

export async function deleteAgentPreset(id: string): Promise<void> {
  const db = await getDatabase()
  await db.deleteFrom('agent_presets').where('id', '=', id).execute()
}

export async function deleteAllAgentPresets(): Promise<void> {
  const db = await getDatabase()
  await db.deleteFrom('agent_presets').execute()
}
