'use server'
import 'server-only'

import {
  deleteSession,
  loginWithTotp,
} from '@/backstage/service/auth.service'
import type { TotpLoginInput } from '@/backstage/service/auth.types'
import { redirect } from 'next/navigation'

export async function login(loginData: TotpLoginInput) {
  const result = await loginWithTotp(loginData)
  if (!result.ok) {
    return { errors: result.errors }
  }
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/')
}
