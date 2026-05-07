import { z } from 'zod'

/** POST /api/agent/sessions */
export const createAgentSessionBodySchema = z.object({
  prompt: z.string().min(1).max(80_000),
})

export type CreateAgentSessionBody = z.infer<typeof createAgentSessionBodySchema>

/** GET /api/agent/sessions/:id/log */
export const agentLogQuerySchema = z.object({
  startLine: z.coerce.number().int().min(0).default(0),
  lineLimit: z.coerce.number().int().min(1).max(500).default(100),
})

export type AgentLogQuery = z.infer<typeof agentLogQuerySchema>

/** 元数据响应（不含 logBlob） */
export type AgentSessionMetaDto = {
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

/** GET log 响应 */
export type AgentSessionLogDto = {
  text: string
  startLine: number
  nextStartLine: number
  totalLines: number
  status: string
  exitCode: number | null
}
