/** 番茄钟 session 的 localStorage key */
export const POMODORO_STORAGE_KEY = 'navi_pomodoro_session'
/** 番茄钟时长（毫秒） */
export const POMODORO_DURATION_MS = 30 * 60 * 1000

export interface PomodoroSession {
  startTime: number
  projectId: string
  weekNumber: number
}

/** 兼容旧版存 taskId 的 localStorage */
type StoredSession = PomodoroSession & { taskId?: string }

export function getPomodoroSession(): PomodoroSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    const projectId = parsed.projectId ?? parsed.taskId
    if (
      typeof parsed.startTime !== 'number' ||
      !projectId ||
      typeof parsed.weekNumber !== 'number'
    )
      return null
    return {
      startTime: parsed.startTime,
      projectId,
      weekNumber: parsed.weekNumber,
    }
  } catch {
    return null
  }
}

export function savePomodoroSessionToStorage(
  session: PomodoroSession | null
): void {
  if (typeof window === 'undefined') return
  if (session === null) {
    localStorage.removeItem(POMODORO_STORAGE_KEY)
  } else {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(session))
  }
}
