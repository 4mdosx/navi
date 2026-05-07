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
