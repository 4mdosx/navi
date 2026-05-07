import 'server-only'

import type { AgentOptions } from '@cursor/sdk'
import {
  createAgentPreset,
  deleteAllAgentPresets,
  deleteAgentPreset,
  getAgentPresetById,
  listAgentPresets,
  updateAgentPreset,
} from '@/backstage/agent/agent-preset.repository'

export type AgentRuntime = 'local' | 'cloud'

export type AgentPreset = {
  id: string
  label: string
  runtime: AgentRuntime
  promptPrefix?: string
  local?: {
    cwd?: string
  }
}

export type AgentCatalog = {
  defaultAgentId: string
  presets: AgentPreset[]
}

function parseCloudReposFromEnv(): NonNullable<
  NonNullable<AgentOptions['cloud']>['repos']
> {
  const raw = process.env.AGENT_CLOUD_REPOS_JSON?.trim()
  if (!raw) {
    throw new Error(
      'AGENT_CLOUD_REPOS_JSON is required when cloud runtime is enabled (JSON array of { url, startingRef? })'
    )
  }
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AGENT_CLOUD_REPOS_JSON must be a non-empty JSON array')
  }
  return parsed.map((row) => {
    const o = row as { url?: string; startingRef?: string }
    if (!o.url || typeof o.url !== 'string') {
      throw new Error('Each cloud repo entry must include a string "url"')
    }
    return {
      url: o.url,
      ...(typeof o.startingRef === 'string' ? { startingRef: o.startingRef } : {}),
    }
  })
}

function defaultCatalog(): AgentCatalog {
  return {
    defaultAgentId: 'navi-local',
    presets: [
      {
        id: 'navi-local',
        label: 'Navi Local',
        runtime: 'local',
        promptPrefix:
          'You are working in a Navi-managed notes repository.\nGit branch policy: do all edits on branch `agent-dev` only.',
        local: {
          cwd: '/Users/token/Workshop/navi',
        },
      },
    ],
  }
}

export function getDefaultAgentPreset(): AgentPreset {
  return defaultCatalog().presets[0]
}

function mapDbPresetToPreset(row: {
  id: string
  label: string
  runtime: 'local' | 'cloud'
  promptPrefix: string
  localCwd: string | null
}): AgentPreset {
  return {
    id: row.id,
    label: row.label,
    runtime: row.runtime,
    promptPrefix: row.promptPrefix,
    ...(row.runtime === 'local' ? { local: { cwd: row.localCwd ?? undefined } } : {}),
  }
}

export async function getAgentCatalog(): Promise<AgentCatalog> {
  const dbPresets = await listAgentPresets()
  const fallback = defaultCatalog()
  const presets = dbPresets.length > 0 ? dbPresets.map(mapDbPresetToPreset) : fallback.presets
  const defaultAgentId = presets[0]?.id ?? fallback.defaultAgentId

  return { defaultAgentId, presets }
}

export async function listAgentChoices(): Promise<
  Array<{ id: string; label: string; runtime: AgentRuntime }>
> {
  const catalog = await getAgentCatalog()
  return catalog.presets.map((p) => ({
    id: p.id,
    label: p.label,
    runtime: p.runtime,
  }))
}

export async function resolveAgentPreset(agentId?: string | null): Promise<AgentPreset> {
  const catalog = await getAgentCatalog()
  if (!agentId) {
    const byDefault = catalog.presets.find((p) => p.id === catalog.defaultAgentId)
    if (byDefault) return byDefault
    return catalog.presets[0]
  }
  const matched = catalog.presets.find((p) => p.id === agentId)
  if (!matched) {
    throw new Error(`Unknown agent preset: ${agentId}`)
  }
  return matched
}

export async function createAgentPresetConfig(input: {
  id: string
  label: string
  runtime: AgentRuntime
  promptPrefix?: string
  local?: { cwd?: string }
}): Promise<void> {
  await createAgentPreset({
    id: input.id,
    label: input.label,
    runtime: input.runtime,
    promptPrefix: input.promptPrefix ?? '',
    localCwd: input.runtime === 'local' ? (input.local?.cwd ?? null) : null,
  })
}

export async function updateAgentPresetConfig(
  id: string,
  patch: Partial<{
    label: string
    runtime: AgentRuntime
    promptPrefix: string
    local: { cwd?: string }
  }>
): Promise<void> {
  await updateAgentPreset(id, {
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.runtime !== undefined ? { runtime: patch.runtime } : {}),
    ...(patch.promptPrefix !== undefined ? { promptPrefix: patch.promptPrefix } : {}),
    ...(patch.local !== undefined ? { localCwd: patch.local.cwd ?? null } : {}),
    ...(patch.runtime === 'cloud' ? { localCwd: null } : {}),
  })
}

export async function removeAgentPresetConfig(id: string): Promise<void> {
  const all = await listAgentPresets()
  if (all.length <= 1) {
    throw new Error('At least one agent preset is required')
  }
  await deleteAgentPreset(id)
}

export async function getAgentPresetConfigById(id: string): Promise<AgentPreset | null> {
  const row = await getAgentPresetById(id)
  if (!row) return null
  return mapDbPresetToPreset(row)
}

export async function resetAgentPresetConfigsToDefault(): Promise<void> {
  const preset = getDefaultAgentPreset()
  await deleteAllAgentPresets()
  await createAgentPreset({
    id: preset.id,
    label: preset.label,
    runtime: preset.runtime,
    promptPrefix: preset.promptPrefix ?? '',
    localCwd: preset.local?.cwd ?? null,
  })
}

export function buildPromptWithPreset(
  preset: AgentPreset,
  userPrompt: string
): string {
  const prefix = preset.promptPrefix?.trim()
  if (!prefix) return userPrompt
  return [prefix, '', 'User task:', userPrompt].join('\n')
}

export async function buildAgentOptionsForPreset(
  preset: AgentPreset
): Promise<AgentOptions> {
  const apiKey = process.env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('CURSOR_API_KEY is not set')
  }
  const modelId = process.env.AGENT_CURSOR_MODEL?.trim() || 'composer-2'

  if (preset.runtime === 'cloud') {
    const repos = parseCloudReposFromEnv()
    return {
      apiKey,
      model: { id: modelId },
      cloud: {
        repos,
        skipReviewerRequest: true,
      },
    }
  }

  const cwd = preset.local?.cwd?.trim() || process.env.AGENT_LOCAL_CWD?.trim() || process.cwd()
  return {
    apiKey,
    model: { id: modelId },
    local: {
      cwd,
      settingSources: [],
    },
  }
}
