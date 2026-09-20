import { NextRequest, NextResponse } from 'next/server'
import { createLongTermPlan, listLongTermPlans } from '@/backstage/long-term-plan/long-term-plan.service'

export async function GET(request: NextRequest) {
  try { return NextResponse.json({ success: true, data: await listLongTermPlans(request.nextUrl.searchParams.get('date') || undefined) }) }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Plan request failed' }, { status: 400 }) }
}

export async function POST(request: NextRequest) {
  try { return NextResponse.json({ success: true, data: await createLongTermPlan(await request.json()) }, { status: 201 }) }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Plan request failed' }, { status: 400 }) }
}
