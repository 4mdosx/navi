import { NextRequest, NextResponse } from 'next/server'
import { listExecutionActivity } from '@/backstage/execution/execution.service'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: await listExecutionActivity(request.nextUrl.searchParams.get('from') || undefined) })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Execution activity request failed' }, { status: 400 })
  }
}
