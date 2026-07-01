import { NextRequest, NextResponse } from 'next/server'
import { getWeekPlanData } from '@/backstage/week-plan/week-plan.service'
import { formatWeekStart } from '@/backstage/week-plan/week-utils'

export async function GET(request: NextRequest) {
  try {
    const weekStartParam = request.nextUrl.searchParams.get('weekStart')
    const weekStart = weekStartParam ?? formatWeekStart(new Date())

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: 'weekStart must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const data = await getWeekPlanData(weekStart)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error reading week plan:', error)
    return NextResponse.json(
      { error: 'Failed to read week plan' },
      { status: 500 }
    )
  }
}
