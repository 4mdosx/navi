export type AgentSessionMeta = {
  id: string
  status: string
  startedAt: string
  endedAt: string | null
  exitCode: number | null
  sdkRunId: string | null
  sdkAgentId: string | null
  sdkRuntime: string | null
  taskParamsJson: string
  createdAt: string
}

export type AgentLogResponse = {
  events: unknown[]
  startLine: number
  nextStartLine: number
  totalLines: number
  status: string
  exitCode: number | null
}

export type AgentPresetChoice = {
  id: string
  label: string
  runtime: 'local' | 'cloud'
}

export type AgentPreset = {
  id: string
  label: string
  runtime: 'local' | 'cloud'
  promptPrefix: string
  local?: {
    cwd?: string
  }
}

export type AgentConfigResponse = {
  defaultAgent: string
  agents: AgentPresetChoice[]
  presets: AgentPreset[]
}
