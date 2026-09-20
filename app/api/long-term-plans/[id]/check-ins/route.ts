import { NextRequest, NextResponse } from 'next/server'
import { checkInLongTermPlan } from '@/backstage/long-term-plan/long-term-plan.service'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    return NextResponse.json({ success: true, data: await checkInLongTermPlan(id, body.note) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Check-in failed' }, { status: 400 })
  }
}
