'use client'

import { useMemo, useCallback } from 'react'
import { mutate as globalMutate } from 'swr'
import {
  getCurrentWeekNumber,
  getWeekStartDate,
  getProjectStartWeek,
} from '@/backstage/projects/utils'
import type { Project } from '@/types/projects'
import { ProjectWeekCard } from './project-week-card'

const PROJECTS_KEY = '/api/projects'

export interface CurrentWeekSectionProps {
  projects: Project[]
  activeProjectId?: string | null
  selectedWeekNumber?: number | null
}

/** 当前周/选中周的项目展示区 */
export function CurrentWeekSection({
  projects,
  activeProjectId,
  selectedWeekNumber,
}: CurrentWeekSectionProps) {
  const activeProjects = useMemo(() => {
    if (activeProjectId) {
      const p = projects.find((x) => x.id === activeProjectId)
      return p?.week && p.week.length > 0 ? [p] : []
    }
    return []
  }, [projects, activeProjectId])

  const displayWeekNumber = useMemo(() => {
    if (selectedWeekNumber !== null && selectedWeekNumber !== undefined) {
      return selectedWeekNumber
    }
    if (activeProjects.length > 0) {
      return getCurrentWeekNumber(activeProjects[0])
    }
    return null
  }, [selectedWeekNumber, activeProjects])

  const handleAddRecord = useCallback(
    async (
      projectId: string,
      weekItemIndex: number,
      recordContent: string,
      goal?: number
    ) => {
      const response = await fetch('/api/projects/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          weekItemIndex,
          recordContent,
          goal: goal ?? 0,
        }),
      })
      if (!response.ok) {
        const errBody = await response.json()
        throw new Error(errBody.error || '添加记录失败')
      }
      await globalMutate(PROJECTS_KEY, undefined, { revalidate: true })
    },
    []
  )

  const handleDeleteRecord = useCallback(
    async (
      projectId: string,
      weekItemIndex: number,
      recordIndex: number
    ) => {
      const response = await fetch('/api/projects/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, weekItemIndex, recordIndex }),
      })
      if (!response.ok) {
        const errBody = await response.json()
        throw new Error(errBody.error || '删除记录失败')
      }
      await globalMutate(PROJECTS_KEY, undefined, { revalidate: true })
    },
    []
  )

  if (activeProjects.length === 0 || displayWeekNumber === null) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {activeProjects.map((project) => {
          const projectStartWeek = getProjectStartWeek(project)
          const weekNumber = displayWeekNumber
          const weekStartDate = getWeekStartDate(weekNumber, projectStartWeek)
          return (
            <ProjectWeekCard
              key={project.id}
              project={project}
              weekNumber={weekNumber}
              weekStartDate={weekStartDate}
              onAddRecord={handleAddRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          )
        })}
      </div>
    </div>
  )
}
