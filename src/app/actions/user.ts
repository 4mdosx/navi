'use server'
import 'server-only'
import { verifySessionGuard } from '@/modules/auth/service'
import { getUser } from '@/modules/user/service'

export async function getUserProfile() {
  const { userId } = await verifySessionGuard()
  return await getUser(userId)
}
