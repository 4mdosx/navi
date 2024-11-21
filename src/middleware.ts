import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/modules/auth/service'
import { cookies } from 'next/headers'

// 1. Specify protected and public routes
const protectedRoutes = ['/micro-app/clipboard'] as string[] // routes that are only accessible to authenticated users
const authRoutes = ['/signup']

export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname
  let isPublicRoute = true
  protectedRoutes.forEach((route) => {
    if (path.startsWith(route)) {
      isPublicRoute = false
    }
  })
  const isAuthRoute = authRoutes.includes(path)

  // 3. Decrypt the session from the cookie
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  // 4. Redirect to /signup if the user is not authenticated
  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/signup', req.nextUrl))
  }

  // 5. Redirect to /dashboard if the user is authenticated
  if (
    isAuthRoute &&
    session?.userId
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
