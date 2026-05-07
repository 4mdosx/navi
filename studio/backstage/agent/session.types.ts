import { z } from 'zod'

/** POST /api/agent/sessions */
export const createAgentSessionBodySchema = z.object({
  prompt: z.string().min(1).max(80_000),
  agent: z.string().min(1).max(120).optional(),
})

export type CreateAgentSessionBody = z.infer<typeof createAgentSessionBodySchema>

/** POST /api/agent/sessions/:id/messages */
export const appendAgentMessageBodySchema = z.object({
  text: z.string().min(1).max(80_000),
  agent: z.string().min(1).max(120).optional(),
})

export type AppendAgentMessageBody = z.infer<typeof appendAgentMessageBodySchema>

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
  /**
   * NDJSON lines parsed as JSON values.
   * Each entry is expected to be a `SDKMessage` (from `@cursor/sdk`), but the server
   * intentionally stays permissive to allow forward-compatible message shapes.
   */
  events: unknown[]
  startLine: number
  nextStartLine: number
  totalLines: number
  status: string
  exitCode: number | null
}

export type AgentPresetChoiceDto = {
  id: string
  label: string
  runtime: 'local' | 'cloud'
}

export const agentPresetBodySchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
  runtime: z.enum(['local', 'cloud']),
  promptPrefix: z.string().max(80_000).default(''),
  local: z
    .object({
      cwd: z.string().min(1).max(2000).optional(),
    })
    .optional(),
})

export const patchAgentPresetBodySchema = z.object({
  label: z.string().min(1).max(120).optional(),
  runtime: z.enum(['local', 'cloud']).optional(),
  promptPrefix: z.string().max(80_000).optional(),
  local: z
    .object({
      cwd: z.string().min(1).max(2000).optional(),
    })
    .optional(),
})

export type AgentPresetDto = {
  id: string
  label: string
  runtime: 'local' | 'cloud'
  promptPrefix: string
  local?: {
    cwd?: string
  }
}
