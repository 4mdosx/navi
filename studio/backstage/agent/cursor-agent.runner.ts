import 'server-only'

import {
  Agent,
  CursorAgentError,
  type AgentOptions,
  type SDKMessage,
} from '@cursor/sdk'
import { getDatabase } from '@/backstage/db/database'
import {
  appendAgentSessionLog,
  getAgentSessionById,
  updateAgentSession,
} from '@/backstage/agent/session.repository'
import {
  attachRun,
  cancelRunIfPossible,
  isCancelRequested,
  registerSessionSlot,
  requestCancel,
  unregisterSession,
} from '@/backstage/agent/agent-active-registry'

/** Navi 侧策略：写进首轮 prompt，约束分支与推送（与 agent-dashboard.md 一致）。 */
export function buildNaviAgentPrompt(userPrompt: string): string {
  return [
    'You are working in a Navi-managed notes repository.',
    'Git branch policy: do all edits on branch `agent-dev` only. Do not merge to `main` or push to remote unless the user explicitly asks in this task.',
    'Prefer small, reviewable changes.',
    '',
    'User task:',
    userPrompt,
  ].join('\n')
}

function parseCloudReposFromEnv(): NonNullable<
  NonNullable<AgentOptions['cloud']>['repos']
> {
  const raw = process.env.AGENT_CLOUD_REPOS_JSON?.trim()
  if (!raw) {
    throw new Error(
      'AGENT_CLOUD_REPOS_JSON is required when AGENT_SDK_RUNTIME=cloud (JSON array of { url, startingRef? })'
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

async function buildAgentOptions(): Promise<AgentOptions> {
  const apiKey = process.env.CURSOR_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('CURSOR_API_KEY is not set')
  }

  const modelId = process.env.AGENT_CURSOR_MODEL?.trim() || 'composer-2'
  const runtime = (process.env.AGENT_SDK_RUNTIME ?? 'local').toLowerCase()

  if (runtime === 'cloud') {
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

  const cwd = process.env.AGENT_LOCAL_CWD?.trim() || process.cwd()
  return {
    apiKey,
    model: { id: modelId },
    local: {
      cwd,
      settingSources: [],
    },
  }
}

async function appendSdkMessage(sessionId: string, msg: SDKMessage): Promise<void> {
  // NDJSON: one SDKMessage per line.
  await appendAgentSessionLog(sessionId, `${JSON.stringify(msg)}\n`)
}

async function countRunningSessions(): Promise<number> {
  const db = await getDatabase()
  const rows = await db
    .selectFrom('agent_sessions')
    .select('id')
    .where('status', '=', 'running')
    .execute()
  return rows.length
}

export async function assertUnderConcurrencyLimit(): Promise<void> {
  const raw = process.env.AGENT_MAX_CONCURRENT?.trim()
  const max = raw ? parseInt(raw, 10) : 2
  if (Number.isNaN(max) || max < 1) return
  const n = await countRunningSessions()
  if (n >= max) {
    const err = new Error(`Too many concurrent agent sessions (max ${max})`)
    ;(err as Error & { statusCode: number }).statusCode = 429
    throw err
  }
}

function exitCodeForRunResult(
  status: 'finished' | 'error' | 'cancelled'
): number {
  if (status === 'finished') return 0
  if (status === 'cancelled') return 130
  return 2
}

async function applyRunTerminalState(
  sessionId: string,
  status: 'finished' | 'failed',
  exitCode: number
): Promise<void> {
  const cur = await getAgentSessionById(sessionId)
  if (!cur || cur.status !== 'running') {
    return
  }
  await updateAgentSession(sessionId, {
    status,
    endedAt: new Date().toISOString(),
    exitCode,
  })
}

/**
 * 在后台跑完一次 SDK：stream → logBlob，wait → 更新状态，dispose agent。
 */
export async function executeCursorAgentSession(
  sessionId: string,
  prompt: string
): Promise<void> {
  registerSessionSlot(sessionId)
  let agent: Awaited<ReturnType<typeof Agent.create>> | undefined

  const fail = async (message: string, exitCode: number) => {
    await appendSdkMessage(sessionId, {
      type: 'task',
      agent_id: 'navi',
      run_id: sessionId,
      text: `[navi] ${message}`,
    })
    await applyRunTerminalState(sessionId, 'failed', exitCode)
  }

  try {
    const options = await buildAgentOptions()
    const runtime = (process.env.AGENT_SDK_RUNTIME ?? 'local').toLowerCase()
    agent = await Agent.create(options)

    const fullPrompt = buildNaviAgentPrompt(prompt)
    const run = await agent.send(fullPrompt)

    attachRun(sessionId, run)

    await updateAgentSession(sessionId, {
      sdkRunId: run.id,
      sdkAgentId: run.agentId,
      sdkRuntime: runtime === 'cloud' ? 'cloud' : 'local',
    })

    const timeoutMs = parseInt(process.env.AGENT_SESSION_TIMEOUT_MS ?? '0', 10)
    if (!Number.isNaN(timeoutMs) && timeoutMs > 0) {
      setTimeout(() => {
        void cancelRunIfPossible(sessionId)
      }, timeoutMs)
    }

    try {
      for await (const msg of run.stream()) {
        if (isCancelRequested(sessionId) && run.supports('cancel')) {
          await run.cancel()
          break
        }
        await appendSdkMessage(sessionId, msg)
      }
    } catch (streamErr) {
      const msg =
        streamErr instanceof Error ? streamErr.message : String(streamErr)
      await appendSdkMessage(sessionId, {
        type: 'task',
        agent_id: 'navi',
        run_id: sessionId,
        text: `[navi stream] ${msg}`,
      })
    }

    const result = await run.wait()
    const cur = await getAgentSessionById(sessionId)
    if (!cur || cur.status !== 'running') {
      return
    }

    if (result.status === 'error') {
      await updateAgentSession(sessionId, {
        status: 'failed',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('error'),
      })
    } else if (result.status === 'cancelled') {
      await updateAgentSession(sessionId, {
        status: 'finished',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('cancelled'),
      })
    } else {
      await updateAgentSession(sessionId, {
        status: 'finished',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('finished'),
      })
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      await fail(`SDK error: ${err.message}`, 1)
    } else if (err instanceof Error) {
      await fail(err.message, 1)
    } else {
      await fail('Unknown error', 1)
    }
  } finally {
    unregisterSession(sessionId)
    if (agent) {
      try {
        await agent[Symbol.asyncDispose]()
      } catch {
        agent.close()
      }
    }
  }
}

/**
 * 追加一条用户 follow-up 消息到同一个 session（复用 sdkAgentId）。
 * 每次 follow-up 会创建一个新的 run，并将事件继续追加到同一份 logBlob。
 */
export async function executeCursorAgentFollowUp(
  sessionId: string,
  text: string
): Promise<void> {
  registerSessionSlot(sessionId)
  let agent: Awaited<ReturnType<typeof Agent.create>> | undefined

  const fail = async (message: string, exitCode: number) => {
    await appendSdkMessage(sessionId, {
      type: 'task',
      agent_id: 'navi',
      run_id: sessionId,
      text: `[navi] ${message}`,
    })
    await applyRunTerminalState(sessionId, 'failed', exitCode)
  }

  try {
    const row = await getAgentSessionById(sessionId)
    if (!row) {
      await fail('Session not found', 1)
      return
    }
    if (!row.sdkAgentId) {
      await fail('Missing sdkAgentId', 1)
      return
    }

    const options = await buildAgentOptions()
    const runtime = (process.env.AGENT_SDK_RUNTIME ?? 'local').toLowerCase()
    agent = await Agent.resume(row.sdkAgentId, options)

    const run = await agent.send(text)
    attachRun(sessionId, run)

    await updateAgentSession(sessionId, {
      sdkRunId: run.id,
      sdkAgentId: run.agentId,
      sdkRuntime: runtime === 'cloud' ? 'cloud' : 'local',
    })

    const timeoutMs = parseInt(process.env.AGENT_SESSION_TIMEOUT_MS ?? '0', 10)
    if (!Number.isNaN(timeoutMs) && timeoutMs > 0) {
      setTimeout(() => {
        void cancelRunIfPossible(sessionId)
      }, timeoutMs)
    }

    try {
      for await (const msg of run.stream()) {
        if (isCancelRequested(sessionId) && run.supports('cancel')) {
          await run.cancel()
          break
        }
        await appendSdkMessage(sessionId, msg)
      }
    } catch (streamErr) {
      const msg =
        streamErr instanceof Error ? streamErr.message : String(streamErr)
      await appendSdkMessage(sessionId, {
        type: 'task',
        agent_id: 'navi',
        run_id: sessionId,
        text: `[navi stream] ${msg}`,
      })
    }

    const result = await run.wait()
    const cur = await getAgentSessionById(sessionId)
    if (!cur || cur.status !== 'running') {
      return
    }

    if (result.status === 'error') {
      await updateAgentSession(sessionId, {
        status: 'failed',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('error'),
      })
    } else if (result.status === 'cancelled') {
      await updateAgentSession(sessionId, {
        status: 'finished',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('cancelled'),
      })
    } else {
      await updateAgentSession(sessionId, {
        status: 'finished',
        endedAt: new Date().toISOString(),
        exitCode: exitCodeForRunResult('finished'),
      })
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      await fail(`SDK error: ${err.message}`, 1)
    } else if (err instanceof Error) {
      await fail(err.message, 1)
    } else {
      await fail('Unknown error', 1)
    }
  } finally {
    unregisterSession(sessionId)
    if (agent) {
      try {
        await agent[Symbol.asyncDispose]()
      } catch {
        agent.close()
      }
    }
  }
}

export async function abortCursorAgentSession(sessionId: string): Promise<{
  ok: boolean
  message?: string
}> {
  const row = await getAgentSessionById(sessionId)
  if (!row) {
    return { ok: false, message: 'Session not found' }
  }
  if (row.status !== 'running') {
    return { ok: false, message: 'Session is not running' }
  }

  requestCancel(sessionId)
  await cancelRunIfPossible(sessionId)

  await updateAgentSession(sessionId, {
    status: 'failed',
    endedAt: new Date().toISOString(),
    exitCode: 130,
  })

  return { ok: true }
}
