import { Suspense } from 'react'
import { requireAppAccess } from '@/backstage/service/auth.service'
import WeekPlanPage from './_todo/todo-center'

export default async function HomePage() {
  await requireAppAccess()
  return (
    <Suspense>
      <WeekPlanPage />
    </Suspense>
  )
}
