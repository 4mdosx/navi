import { NextRequest, NextResponse } from 'next/server'
import { updatePlanOccurrence } from '@/backstage/long-term-plan/long-term-plan.service'
import type { PlanOccurrenceStatus } from '@/types/long-term-plan'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await request.json()
    return NextResponse.json({ success: true, data: await updatePlanOccurrence(id, body.status as PlanOccurrenceStatus, body.note) })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Occurrence request failed' }, { status: 400 })
  }
}
