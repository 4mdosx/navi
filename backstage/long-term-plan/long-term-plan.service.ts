import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type { LongTermPlan, LongTermPlanWithProgress, PlanCheckIn, PlanOccurrence, PlanOccurrenceStatus } from '@/types/long-term-plan'

type CreatePlanInput = Omit<LongTermPlan, 'id' | 'version' | 'createdAt' | 'updatedAt'>

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d) }
const startOfWeek = (date: Date) => { const value = new Date(date); value.setHours(0, 0, 0, 0); value.setDate(value.getDate() - value.getDay()); return value }

function mapPlan(row: any): LongTermPlan {
  return { ...row, preferredDays: JSON.parse(row.preferredDays || '[]') }
}
function mapOccurrence(row: any): PlanOccurrence { return row as PlanOccurrence }

export async function createLongTermPlan(input: CreatePlanInput): Promise<LongTermPlan> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `plan-${Date.now()}-${nanoid(8)}`
  await db.insertInto('long_term_plans').values({
    ...input,
    id,
    preferredDays: JSON.stringify(input.preferredDays),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }).execute()
  return mapPlan(await db.selectFrom('long_term_plans').selectAll().where('id', '=', id).executeTakeFirstOrThrow())
}

export async function materializePlanOccurrences(from: string, to: string): Promise<void> {
  const db = await getDatabase()
  const plans = (await db.selectFrom('long_term_plans').selectAll().where('status', '=', 'active').execute()).map(mapPlan)
  const rangeStart = parseDate(from)
  const rangeEnd = parseDate(to)
  for (const plan of plans) {
    for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setDate(cursor.getDate() + 1)) {
      const key = dateKey(cursor)
      if (key < plan.startDate || (plan.endDate && key > plan.endDate)) continue
      const weeks = Math.floor((startOfWeek(cursor).getTime() - startOfWeek(parseDate(plan.startDate)).getTime()) / 604800000)
      if (weeks % plan.intervalWeeks !== 0) continue
      if (plan.cadence === 'weekly' && !plan.preferredDays.includes(cursor.getDay())) continue
      const now = new Date().toISOString()
      await db.insertInto('plan_occurrences').values({
        id: `occ-${plan.id}-${key}`, planId: plan.id, scheduledDate: key, status: 'pending',
        actualMinutes: null, note: '', completedAt: null, createdAt: now, updatedAt: now,
      }).onConflict((conflict) => conflict.columns(['planId', 'scheduledDate']).doNothing()).execute()
    }
  }
}

export async function listLongTermPlans(referenceDate = dateKey(new Date())): Promise<LongTermPlanWithProgress[]> {
  const weekStart = startOfWeek(parseDate(referenceDate))
  const historyStart = new Date(weekStart); historyStart.setDate(historyStart.getDate() - 7 * 15)
  const db = await getDatabase()
  const plans = (await db.selectFrom('long_term_plans').selectAll().orderBy('createdAt').execute()).map(mapPlan)
  const checkIns = await db.selectFrom('plan_check_ins').selectAll()
    .where('weekStart', '>=', dateKey(historyStart)).orderBy('checkedAt', 'desc').execute() as PlanCheckIn[]
  return plans.map((plan) => {
    const own = checkIns.filter((item) => item.planId === plan.id)
    const counts = new Map<string, number>()
    for (const checkIn of own) counts.set(checkIn.weekStart, (counts.get(checkIn.weekStart) ?? 0) + 1)
    const currentWeek = dateKey(weekStart)
    return {
      ...plan,
      occurrences: [],
      weekStart: currentWeek,
      checkIns: own,
      cycleDone: counts.get(currentWeek) ?? 0,
      weeklyHistory: [...counts].map(([historyWeekStart, count]) => ({ weekStart: historyWeekStart, count }))
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    }
  })
}

export async function checkInLongTermPlan(planId: string, note = ''): Promise<PlanCheckIn> {
  const db = await getDatabase()
  await db.selectFrom('long_term_plans').select('id').where('id', '=', planId).executeTakeFirstOrThrow()
  const now = new Date()
  const checkIn = {
    id: `checkin-${Date.now()}-${nanoid(8)}`,
    planId,
    weekStart: dateKey(startOfWeek(now)),
    checkedAt: now.toISOString(),
    note: note.trim(),
  }
  await db.insertInto('plan_check_ins').values(checkIn).execute()
  return checkIn
}

export async function updateLongTermPlan(id: string, input: { targetCount?: number }): Promise<LongTermPlan> {
  const db = await getDatabase()
  const current = await db.selectFrom('long_term_plans').selectAll().where('id', '=', id).executeTakeFirstOrThrow()
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString(), version: current.version + 1 }
  if (input.targetCount != null) updates.targetCount = Math.max(1, Math.round(input.targetCount))
  await db.updateTable('long_term_plans').set(updates).where('id', '=', id).execute()
  return mapPlan(await db.selectFrom('long_term_plans').selectAll().where('id', '=', id).executeTakeFirstOrThrow())
}

export async function updatePlanOccurrence(id: string, status: PlanOccurrenceStatus, note?: string): Promise<PlanOccurrence> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.updateTable('plan_occurrences').set({
    status, note: note ?? '', updatedAt: now, completedAt: status === 'done' ? now : null,
  }).where('id', '=', id).execute()
  return mapOccurrence(await db.selectFrom('plan_occurrences').selectAll().where('id', '=', id).executeTakeFirstOrThrow())
}
