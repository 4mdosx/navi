import { isRestKind, type TodoKind } from '@/types/todo'

export const REST_SESSION_MINUTES = 20
export const WORK_SESSION_MINUTES = 30
export const REST_SESSION_MS = REST_SESSION_MINUTES * 60_000
export const WORK_SESSION_MS = WORK_SESSION_MINUTES * 60_000

export function sessionLimitMs(kind: TodoKind) {
  return isRestKind(kind) ? REST_SESSION_MS : WORK_SESSION_MS
}

export function sessionLimitMinutes(kind: TodoKind) {
  return isRestKind(kind) ? REST_SESSION_MINUTES : WORK_SESSION_MINUTES
}
