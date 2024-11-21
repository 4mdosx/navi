'use server'
import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import { SessionPayload } from './definitions'
import { Role } from '@/modules/user/definitions'
import { getUser } from '@/modules/user/service'

export async function verifySessionGuard (role: Role = { admin: false, user: true }) {
  const session = await verifySession()
  if (!session.isAuth || !session.user) {
    redirect('/signup')
  }

  let activeCode = 0
  if (role.admin) {
    activeCode = 2
  } else if (role.user) {
    activeCode = 1
  }

  if (Number(session.user?.active) < activeCode) {
    redirect('/waitlist')
  }

  return session
}

export const verifySession = async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    return { isAuth: false, userId: 0 }
  }

  return { isAuth: true, userId: session.userId as number, user: await getUser(session.userId as number) }
}


const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    console.log('Failed to verify session')
  }
}

export async function createSession(userId: number) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const jwt = await encrypt({ userId, expiresAt })
  const userCookies = await cookies()
  userCookies.set('session', jwt, {
    httpOnly: true,
    secure: true,
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

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  ;(await cookies()).delete('session')
}
