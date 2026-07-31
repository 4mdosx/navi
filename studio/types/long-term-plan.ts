export type LongTermPlanStatus = 'active' | 'paused' | 'done'
export type LongTermPlanCadence = 'daily' | 'weekly'
export type LongTermPlanScheduleMode = 'fixed_days' | 'weekly_quota'
export type PlanOccurrenceStatus = 'pending' | 'active' | 'done' | 'skipped' | 'missed'

export type LongTermPlan = {
  id: string
  sourceTodoId: string | null
  title: string
  description: string
  status: LongTermPlanStatus
  cadence: LongTermPlanCadence
  scheduleMode: LongTermPlanScheduleMode
  intervalWeeks: number
  targetCount: number
  stretchCount: number | null
  preferredDays: number[]
  estimatedMinutes: number
  startDate: string
  endDate: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type PlanOccurrence = {
  id: string
  planId: string
  scheduledDate: string
  status: PlanOccurrenceStatus
  actualMinutes: number | null
  note: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PlanCheckIn = {
  id: string
  planId: string
  weekStart: string
  checkedAt: string
  note: string
}

export type PlanWeekProgress = {
  weekStart: string
  count: number
}

export type LongTermPlanWithProgress = LongTermPlan & {
  occurrences: PlanOccurrence[]
  cycleDone: number
  weekStart: string
  checkIns: PlanCheckIn[]
  weeklyHistory: PlanWeekProgress[]
}
