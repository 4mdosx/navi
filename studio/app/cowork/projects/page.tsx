'use client'

import { ProjectsView } from '@/feature/projects/components/projects-view'
import { useProjects } from '@/feature/projects/hooks/use-projects'

export default function ProjectsPage() {
  const { projects, isError } = useProjects()

  return (
    <div className="container mx-auto py-4 max-w-7xl">
      {isError && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          <p className="font-semibold">无法加载项目</p>
          <p className="text-sm mt-1">
            {isError.message || '请确保已设置项目路径 (project_path)'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <ProjectsView projects={projects ?? undefined} />
        </div>
      </div>
    </div>
  )
}
