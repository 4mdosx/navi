import 'server-only'

import { type Updateable, sql } from 'kysely'
import { nanoid } from 'nanoid'

import { getDatabase } from '@/backstage/db/database'
import type { Database } from '@/backstage/db/types'

export type AgentSessionStatus = 'running' | 'finished' | 'failed'

export type AgentSessionRow = {
  id: string
  status: AgentSessionStatus
  startedAt: string
  endedAt: string | null
  exitCode: number | null
  sdkRunId: string | null
  sdkAgentId: string | null
  sdkRuntime: string | null
  taskParamsJson: string
  createdAt: string
  logBlob: string
}

function rowFromDb(r: {
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
  logBlob: string
}): AgentSessionRow {
  const status = r.status as AgentSessionStatus
  return {
    ...r,
    status:
      status === 'running' || status === 'finished' || status === 'failed'
        ? status
        : 'failed',
  }
}

/**
 * 新建一条 running 状态的 session；`Agent.send` 返回 run 后请 `updateAgentSession` 写入 sdk* 字段。
 */
export async function createAgentSession(params: {
  taskParams: unknown
}): Promise<string> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `agent-${Date.now()}-${nanoid(8)}`
  const taskParamsJson = JSON.stringify(params.taskParams ?? {})

  await db
    .insertInto('agent_sessions')
    .values({
      id,
      status: 'running',
      startedAt: now,
      endedAt: null,
      exitCode: null,
      sdkRunId: null,
      sdkAgentId: null,
      sdkRuntime: null,
      taskParamsJson,
      createdAt: now,
      logBlob: '',
    })
    .execute()

  return id
}

export async function getAgentSessionById(
  id: string
): Promise<AgentSessionRow | undefined> {
  const db = await getDatabase()
  const r = await db
    .selectFrom('agent_sessions')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  return r ? rowFromDb(r) : undefined
}

export async function listAgentSessions(options?: {
  limit?: number
}): Promise<AgentSessionRow[]> {
  const db = await getDatabase()
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)

  const rows = await db
    .selectFrom('agent_sessions')
    .selectAll()
    .orderBy('startedAt', 'desc')
    .limit(limit)
    .execute()

  return rows.map(rowFromDb)
}

type AgentSessionPatch = Pick<
  Updateable<Database['agent_sessions']>,
  | 'status'
  | 'endedAt'
  | 'exitCode'
  | 'sdkRunId'
  | 'sdkAgentId'
  | 'sdkRuntime'
>

export async function updateAgentSession(
  id: string,
  patch: Partial<{
    status: AgentSessionStatus
    endedAt: string | null
    exitCode: number | null
    sdkRunId: string | null
    sdkAgentId: string | null
    sdkRuntime: string | null
  }>
): Promise<void> {
  const db = await getDatabase()
  const updates: Partial<AgentSessionPatch> = {}
  if (patch.status !== undefined) updates.status = patch.status
  if (patch.endedAt !== undefined) updates.endedAt = patch.endedAt
  if (patch.exitCode !== undefined) updates.exitCode = patch.exitCode
  if (patch.sdkRunId !== undefined) updates.sdkRunId = patch.sdkRunId
  if (patch.sdkAgentId !== undefined) updates.sdkAgentId = patch.sdkAgentId
  if (patch.sdkRuntime !== undefined) updates.sdkRuntime = patch.sdkRuntime

  if (Object.keys(updates).length === 0) return

  await db
    .updateTable('agent_sessions')
    .set(updates)
    .where('id', '=', id)
    .execute()
}

/**
 * 将原始终端字节/文本追加到 session.logBlob（ANSI 原样拼接）。
 */
export async function appendAgentSessionLog(
  id: string,
  chunk: string
): Promise<void> {
  const db = await getDatabase()
  await db
    .updateTable('agent_sessions')
    .set({
      logBlob: sql<string>`COALESCE(logBlob, '') || ${chunk}`,
    })
    .where('id', '=', id)
    .execute()
}
