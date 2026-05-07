import 'server-only'

/**
 * 内存登记当前 Navi session 对应的 SDK `run`，供 abort 调用 `run.cancel()`。
 * 单 Node 进程有效；多实例部署需改为共享 store + 路由粘性或分布式取消。
 */

type RunLike = {
  supports(op: string): boolean
  cancel(): Promise<void>
}

type Entry = {
  run: RunLike | null
  cancelRequested: boolean
}

const active = new Map<string, Entry>()

export function registerSessionSlot(sessionId: string): void {
  active.set(sessionId, { run: null, cancelRequested: false })
}

export function attachRun(sessionId: string, run: RunLike): void {
  const e = active.get(sessionId)
  if (e) e.run = run
}

export function requestCancel(sessionId: string): boolean {
  const e = active.get(sessionId)
  if (!e) return false
  e.cancelRequested = true
  return true
}

export function isCancelRequested(sessionId: string): boolean {
  return active.get(sessionId)?.cancelRequested ?? false
}

export async function cancelRunIfPossible(sessionId: string): Promise<void> {
  const e = active.get(sessionId)
  const run = e?.run
  if (!run) return
  if (run.supports('cancel')) {
    await run.cancel()
  }
}

export function unregisterSession(sessionId: string): void {
  active.delete(sessionId)
}
