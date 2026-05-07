'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { AgentSessionMeta, AgentLogResponse } from '@/feature/agent-dashboard/types'
import type { AgentTerminalHandle } from '@/feature/agent-dashboard/agent-terminal'

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

export function useAgentSession(terminalRef: React.RefObject<AgentTerminalHandle | null>) {
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
  const [aborting, setAborting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextStartLineRef = useRef(0)
  const currentPollMsRef = useRef<number>(POLL_VISIBLE_MS)

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
      terminalRef.current?.clear()
    },
    [terminalRef]
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
        if (log.text) {
          terminalRef.current?.write(log.text)
        }
        nextStartLineRef.current = log.nextStartLine

        const hasNewData = log.nextStartLine > startCursor || Boolean(log.text)
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
  }, [selectedId, terminalRef, redirectIfUnauthorized])

  useEffect(() => {
    const onVis = () => {
      terminalRef.current?.fit()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [terminalRef])

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
    loadingList,
    creating,
    aborting,
    error,
    refreshSessions,
    selectSession,
    createSession,
    abortSession,
  }
}
