import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type { ZhipuMessage } from '@/backstage/llm/zhipu-client'

export type LlmInteractionLogRecord = {
  id: string
  feature: string
  model: string
  messages: ZhipuMessage[]
  requestMeta?: {
    temperature?: number
    maxTokens?: number
  }
  responseText: string | null
  error: string | null
  createdAt: string
}

export async function createLlmInteractionLog(input: {
  feature: string
  model: string
  messages: ZhipuMessage[]
  requestMeta?: { temperature?: number; maxTokens?: number }
  responseText?: string | null
  error?: string | null
}): Promise<string> {
  const db = await getDatabase()
  const id = `llm-${Date.now()}-${nanoid(8)}`
  const now = new Date().toISOString()

  await db
    .insertInto('llm_interaction_logs')
    .values({
      id,
      feature: input.feature,
      model: input.model,
      requestJson: JSON.stringify({
        messages: input.messages,
        ...input.requestMeta,
      }),
      responseText: input.responseText ?? null,
      error: input.error ?? null,
      createdAt: now,
    })
    .execute()

  return id
}

export async function getLlmInteractionLogById(
  id: string
): Promise<LlmInteractionLogRecord | null> {
  const db = await getDatabase()
  const row = await db
    .selectFrom('llm_interaction_logs')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) return null

  let messages: ZhipuMessage[] = []
  let requestMeta: LlmInteractionLogRecord['requestMeta']
  try {
    const parsed = JSON.parse(row.requestJson) as {
      messages?: ZhipuMessage[]
      temperature?: number
      maxTokens?: number
    }
    messages = Array.isArray(parsed.messages) ? parsed.messages : []
    requestMeta = {
      temperature: parsed.temperature,
      maxTokens: parsed.maxTokens,
    }
  } catch {
    messages = []
  }

  return {
    id: row.id,
    feature: row.feature,
    model: row.model,
    messages,
    requestMeta,
    responseText: row.responseText,
    error: row.error,
    createdAt: row.createdAt,
  }
}
