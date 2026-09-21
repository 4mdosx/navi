'use server'
import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import {
  SetupPinSchema,
  UnlockPinSchema,
  UpdatePinSchema,
  type PinFieldErrors,
  type SessionPayload,
} from './auth.types'
import {
  getPinEpoch,
  isPinConfigured,
  savePin,
  verifyStoredPin,
} from './pin.service'

const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

function endOfLocalDay(now = new Date()): Date {
  const expiresAt = new Date(now)
  expiresAt.setHours(24, 0, 0, 0)
  return expiresAt
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return {
      expiresAt: payload.expiresAt as SessionPayload['expiresAt'],
      pinEpoch: typeof payload.pinEpoch === 'string' ? payload.pinEpoch : '',
    }
  } catch {
    return
  }
}

export async function verifySessionGuard() {
  return requireAppAccess()
}

export async function requireAppAccess() {
  if (!(await isPinConfigured())) {
    redirect('/login')
  }

  const session = await verifySession()
  if (!session.isAuth) {
    redirect('/login')
  }

  return session
}

export const verifySession = async () => {
  const cookie = (await cookies()).get('session')?.value
  if (!cookie) {
    return { isAuth: false as const }
  }

  const session = await decrypt(cookie)
  const pinEpoch = await getPinEpoch()

  if (!session || !pinEpoch || session.pinEpoch !== pinEpoch) {
    return { isAuth: false as const }
  }

  return { isAuth: true as const, expiresAt: session.expiresAt, pinEpoch }
}

export async function createSession() {
  const pinEpoch = (await getPinEpoch()) ?? ''
  const expiresAt = endOfLocalDay()
  const jwt = await encrypt({ expiresAt, pinEpoch })
  const userCookies = await cookies()
  userCookies.set('session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function updateSession() {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)

  if (!session || !payload) {
    return null
  }

  const expires = endOfLocalDay()

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  ;(await cookies()).delete('session')
}

export async function setupPin(
  input: unknown
): Promise<{ ok: true } | { ok: false; errors: PinFieldErrors }> {
  if (await isPinConfigured()) {
    return { ok: false, errors: { pin: ['PIN 已设置，请直接解锁'] } }
  }

  const parsed = SetupPinSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors }
  }

  await savePin(parsed.data.pin)
  await createSession()
  return { ok: true }
}

export async function loginWithPin(
  input: unknown
): Promise<{ ok: true } | { ok: false; errors: PinFieldErrors }> {
  if (!(await isPinConfigured())) {
    return { ok: false, errors: { pin: ['尚未设置 PIN'] } }
  }

  const parsed = UnlockPinSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors }
  }

  const valid = await verifyStoredPin(parsed.data.pin)
  if (!valid) {
    return { ok: false, errors: { pin: ['PIN 不正确'] } }
  }

  await createSession()
  return { ok: true }
}

export async function updatePin(
  input: unknown
): Promise<{ ok: true } | { ok: false; errors: PinFieldErrors }> {
  if (!(await isPinConfigured())) {
    return { ok: false, errors: { currentPin: ['尚未设置 PIN'] } }
  }

  const parsed = UpdatePinSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors }
  }

  const valid = await verifyStoredPin(parsed.data.currentPin)
  if (!valid) {
    return { ok: false, errors: { currentPin: ['当前 PIN 不正确'] } }
  }

  await savePin(parsed.data.pin)
  await createSession()
  return { ok: true }
}
