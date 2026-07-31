import { NextRequest, NextResponse } from 'next/server'
import { updateLongTermPlan } from '@/backstage/long-term-plan/long-term-plan.service'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    return NextResponse.json({ success: true, data: await updateLongTermPlan(id, await request.json()) })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Plan update failed' }, { status: 400 })
  }
}
