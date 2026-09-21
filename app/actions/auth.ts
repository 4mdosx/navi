'use server'
import 'server-only'

import {
  deleteSession,
  loginWithPin,
  setupPin,
  updatePin,
} from '@/backstage/service/auth.service'
import type {
  SetupPinInput,
  UnlockPinInput,
  UpdatePinInput,
} from '@/backstage/service/auth.types'
import { redirect } from 'next/navigation'

export async function setupAccessPin(input: SetupPinInput) {
  const result = await setupPin(input)
  if (!result.ok) {
    return { errors: result.errors }
  }
  redirect('/')
}

export async function unlockWithPin(input: UnlockPinInput) {
  const result = await loginWithPin(input)
  if (!result.ok) {
    return { errors: result.errors }
  }
  redirect('/')
}

export async function updateAccessPin(input: UpdatePinInput) {
  const result = await updatePin(input)
  if (!result.ok) {
    return { errors: result.errors }
  }
  return { ok: true as const }
}

export async function logout() {
  await deleteSession()
  redirect('/')
}
