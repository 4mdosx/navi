'use client'

import { useState, useCallback } from 'react'
import { WeekTimelineView } from './week-timeline-view'
import { CurrentWeekSection } from './current-week-section'
import { CreateProjectDialog } from './create-project-dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjects } from '../hooks/use-projects'
import type { Project } from '@/types/projects'

interface ProjectsViewProps {
  projects?: Project[]
  onProjectsChange?: (projects: Project[]) => void
}

export function ProjectsView({
  projects: externalProjects,
  onProjectsChange,
}: ProjectsViewProps = {} as ProjectsViewProps) {
  const [internalProjects, setInternalProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { createProject, updateProject, deleteProject } = useProjects()

  const projects = externalProjects ?? internalProjects

  const setProjects = (next: Project[] | ((prev: Project[]) => Project[])) => {
    const updated = typeof next === 'function' ? next(projects) : next
    if (onProjectsChange) {
      onProjectsChange(updated)
    } else {
      setInternalProjects(updated)
    }
  }

  const handleProjectClick = useCallback((project: Project) => {
    setActiveProjectId((prev) => (prev === project.id ? null : project.id))
    setSelectedWeekNumber(null)
  }, [])

  const handleWeekClick = useCallback((projectId: string, weekNumber: number) => {
    setActiveProjectId(projectId)
    setSelectedWeekNumber(weekNumber)
  }, [])

  const handleCreateOpen = useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(
    async (values: {
      title: string
      goal?: number
      initialWeeks?: Array<{ content: string }>
    }) => {
      try {
        await createProject(values)
      } catch (error) {
        console.error('Error creating project:', error)
        throw error
      }
    },
    [createProject]
  )

  return (
    <div>
      <Card className="mb-8">
        <CardHeader className="pb-3">
          {projects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateOpen}
              className="w-fit"
            >
              创建项目
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-muted-foreground mb-2">还没有项目</div>
              <p className="text-sm text-muted-foreground/70">
                创建一个开始追踪你的长期项目吧
              </p>
              <Button variant="outline" onClick={handleCreateOpen} className="mt-4">
                创建项目
              </Button>
            </div>
          ) : (
            <WeekTimelineView
              projects={projects}
              visibleWeeks={20}
              onProjectClick={handleProjectClick}
              activeProjectId={activeProjectId}
              onWeekClick={handleWeekClick}
              onProjectUpdate={updateProject}
              onProjectDelete={deleteProject}
            />
          )}
        </CardContent>
      </Card>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
      />

      <CurrentWeekSection
        projects={projects}
        activeProjectId={activeProjectId}
        selectedWeekNumber={selectedWeekNumber}
      />
    </div>
  )
}
