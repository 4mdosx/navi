'use server'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'

export async function GET(request: Request) {
  const { userId } = await verifySession()

  return NextResponse.json({
    message: 'Hello World',
    userId,
  })
}
