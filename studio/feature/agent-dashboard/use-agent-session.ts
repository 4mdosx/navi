'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AgentSessionMeta, AgentLogResponse } from '@/feature/agent-dashboard/types'

const POLL_VISIBLE_MS = 300
const POLL_HIDDEN_MS = 2500
const POLL_TAIL_MS = 1200
const LINE_LIMIT = 100

const MAX_POLL_VISIBLE_MS = 8000
const MAX_POLL_HIDDEN_MS = 20000
const MAX_POLL_TAIL_MS = 15000

async function parseJson<T>(res: Response): Promise<T | { error: string }> {
  try {
    return (await res.json()) as T
  } catch {
    return { error: 'Invalid response' }
  }
}

export type ConversationTurn = {
  role: 'user' | 'agent'
  events: unknown[]
  done?: boolean
}

export function useAgentSession() {
  const router = useRouter()

  const redirectIfUnauthorized = useCallback(
    (res: Response): boolean => {
      if (res.status === 401) {
        router.replace('/login')
        return true
      }
      return false
    },
    [router]
  )

  const [sessions, setSessions] = useState<AgentSessionMeta[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [aborting, setAborting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextStartLineRef = useRef(0)
  const currentPollMsRef = useRef<number>(POLL_VISIBLE_MS)

  const turnsRef = useRef<ConversationTurn[]>([])
  const currentAgentTurnIndexRef = useRef<number | null>(null)
  const [turns, setTurns] = useState<ConversationTurn[]>([])

  const refreshSessions = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/sessions?limit=50', {
        credentials: 'include',
      })
      if (redirectIfUnauthorized(res)) return
      const data = await parseJson<AgentSessionMeta[]>(res)
      if (!res.ok) {
        const err = data as { error?: string }
        setError(err.error ?? `HTTP ${res.status}`)
        return
      }
      setSessions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'List failed')
    } finally {
      setLoadingList(false)
    }
  }, [redirectIfUnauthorized])

  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  const selectSession = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      nextStartLineRef.current = 0
      setStatus(null)
      setExitCode(null)
      turnsRef.current = []
      currentAgentTurnIndexRef.current = null
      setTurns([])
    },
    []
  )

  useEffect(() => {
    if (!selectedId) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const baseDelay = () =>
      document.visibilityState === 'hidden' ? POLL_HIDDEN_MS : POLL_VISIBLE_MS

    const maxDelay = () =>
      document.visibilityState === 'hidden'
        ? MAX_POLL_HIDDEN_MS
        : MAX_POLL_VISIBLE_MS

    const resetDelay = () => {
      currentPollMsRef.current = baseDelay()
    }

    const backoffDelay = () => {
      currentPollMsRef.current = Math.min(
        Math.max(baseDelay(), currentPollMsRef.current * 2),
        maxDelay()
      )
    }

    const tick = async () => {
      if (cancelled) return

      try {
        const startCursor = nextStartLineRef.current
        const res = await fetch(
          `/api/agent/sessions/${selectedId}/log?startLine=${nextStartLineRef.current}&lineLimit=${LINE_LIMIT}`,
          { credentials: 'include' }
        )
        if (redirectIfUnauthorized(res)) return
        const data = await parseJson<AgentLogResponse>(res)
        if (!res.ok) {
          const err = data as { error?: string }
          setError(err.error ?? `HTTP ${res.status}`)
          backoffDelay()
          timeoutId = setTimeout(tick, currentPollMsRef.current)
          return
        }
        if (!('nextStartLine' in data)) {
          backoffDelay()
          timeoutId = setTimeout(tick, currentPollMsRef.current)
          return
        }
        const log = data as AgentLogResponse
        setStatus(log.status)
        setExitCode(log.exitCode)
        if (Array.isArray(log.events) && log.events.length > 0) {
          let changed = false
          for (const ev of log.events) {
            const type =
              ev && typeof ev === 'object' ? (ev as { type?: unknown }).type : undefined

            if (type === 'user') {
              turnsRef.current.push({ role: 'user', events: [ev], done: true })
              changed = true
              continue
            }

            if (type === 'status') {
              const st = (ev as { status?: unknown }).status
              const isStart = st === 'RUNNING'
              const isEnd =
                st === 'FINISHED' || st === 'ERROR' || st === 'CANCELLED' || st === 'EXPIRED'

              if (isStart) {
                const idx = turnsRef.current.length
                turnsRef.current.push({ role: 'agent', events: [ev], done: false })
                currentAgentTurnIndexRef.current = idx
                changed = true
                continue
              }

              const curIdx = currentAgentTurnIndexRef.current
              if (curIdx != null && turnsRef.current[curIdx]?.role === 'agent') {
                const turn = turnsRef.current[curIdx]
                turn.events.push(ev)
                changed = true
                if (isEnd) {
                  turn.done = true
                  currentAgentTurnIndexRef.current = null
                }
              } else {
                // status but not inside a turn: keep it grouped as a standalone agent line
                turnsRef.current.push({ role: 'agent', events: [ev], done: true })
                changed = true
              }
              continue
            }

            // All other events: attach to current agent turn if we have one.
            const curIdx = currentAgentTurnIndexRef.current
            if (curIdx != null && turnsRef.current[curIdx]?.role === 'agent') {
              turnsRef.current[curIdx].events.push(ev)
              changed = true
              continue
            }

            // Outside of an agent turn: group into its own agent turn (init/system/tool_call prelude).
            turnsRef.current.push({ role: 'agent', events: [ev], done: true })
            changed = true
          }
          if (changed) setTurns([...turnsRef.current])
        }
        nextStartLineRef.current = log.nextStartLine

        const hasNewData = log.nextStartLine > startCursor || (Array.isArray(log.events) && log.events.length > 0)
        if (hasNewData) {
          resetDelay()
        } else {
          backoffDelay()
        }

        const done =
          (log.status === 'finished' || log.status === 'failed') &&
          log.nextStartLine >= log.totalLines

        if (done) {
          return
        }

        const isTerminal = log.status === 'finished' || log.status === 'failed'
        if (isTerminal) {
          currentPollMsRef.current = Math.min(
            Math.max(POLL_TAIL_MS, currentPollMsRef.current),
            MAX_POLL_TAIL_MS
          )
        }
        timeoutId = setTimeout(tick, currentPollMsRef.current)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Poll failed')
        backoffDelay()
        timeoutId = setTimeout(tick, currentPollMsRef.current)
      }
    }

    resetDelay()
    timeoutId = setTimeout(tick, 0)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [selectedId, redirectIfUnauthorized])

  useEffect(() => {
    // no-op; kept for future UI hooks
  }, [])

  const createSession = useCallback(
    async (prompt: string) => {
      setCreating(true)
      setError(null)
      try {
        const res = await fetch('/api/agent/sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        if (redirectIfUnauthorized(res)) return
        const data = await parseJson<{ id: string; status: string }>(res)
        if (!res.ok) {
          const err = data as { error?: string }
          setError(err.error ?? `HTTP ${res.status}`)
          return
        }
        if (!('id' in data)) return
        await refreshSessions()
        selectSession(data.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Create failed')
      } finally {
        setCreating(false)
      }
    },
    [refreshSessions, selectSession, redirectIfUnauthorized]
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const id = selectedId
      if (!id) return
      if (sending) return
      setSending(true)
      setError(null)

      // Optimistic UI: add user turn + placeholder running agent turn.
      const userEvent = {
        type: 'user',
        agent_id: 'navi-ui',
        run_id: id,
        message: { role: 'user', content: [{ type: 'text', text }] },
      }
      turnsRef.current.push({ role: 'user', events: [userEvent], done: true })
      turnsRef.current.push({
        role: 'agent',
        events: [
          {
            type: 'status',
            agent_id: 'navi-ui',
            run_id: id,
            status: 'RUNNING',
            message: '',
          },
        ],
        done: false,
      })
      currentAgentTurnIndexRef.current = turnsRef.current.length - 1
      setTurns([...turnsRef.current])

      try {
        const res = await fetch(`/api/agent/sessions/${id}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (redirectIfUnauthorized(res)) return
        const data = await parseJson<{ ok?: boolean; error?: string }>(res)
        if (!res.ok) {
          const err = data as { error?: string }
          setError(err.error ?? `HTTP ${res.status}`)
          return
        }
        void refreshSessions()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Send failed')
      } finally {
        setSending(false)
      }
    },
    [selectedId, sending, redirectIfUnauthorized, refreshSessions]
  )

  const abortSession = useCallback(async () => {
    if (!selectedId) return
    setAborting(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent/sessions/${selectedId}/abort`, {
        method: 'POST',
        credentials: 'include',
      })
      if (redirectIfUnauthorized(res)) return
      const data = await parseJson<{ ok?: boolean; error?: string }>(res)
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`)
        return
      }
      void refreshSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Abort failed')
    } finally {
      setAborting(false)
    }
  }, [selectedId, refreshSessions, redirectIfUnauthorized])

  return {
    sessions,
    selectedId,
    status,
    exitCode,
    turns,
    loadingList,
    creating,
    sending,
    aborting,
    error,
    refreshSessions,
    selectSession,
    createSession,
    sendMessage,
    abortSession,
  }
}
