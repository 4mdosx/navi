import 'server-only'

import { verifySession } from '@/backstage/service/auth.service'

export type AgentApiAuthOk = { ok: true }
export type AgentApiAuthFail = { ok: false }

/**
 * Agent HTTP API：与 Studio 登录态一致（httpOnly session cookie）。
 */
export async function requireAgentApiAuth(): Promise<
  AgentApiAuthOk | AgentApiAuthFail
> {
  const session = await verifySession()
  if (!session.isAuth) {
    return { ok: false }
  }
  return { ok: true }
}
