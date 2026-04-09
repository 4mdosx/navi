import { NextRequest, NextResponse } from 'next/server'
import {
  readProjectsFromFiles,
  createProjectFile,
  updateProject,
  deleteProject,
  updateWeekItemCompleted,
} from '@/backstage/projects/projects.service'

/**
 * GET - 读取所有项目
 */
export async function GET() {
  try {
    const projects = await readProjectsFromFiles()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error reading projects:', error)

    if (error instanceof Error) {
      if (error.message.includes('Project path not configured')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('does not exist')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to read projects' },
      { status: 500 }
    )
  }
}

/**
 * POST - 创建项目
 * body: { title: string, goal?: number, initialWeeks?: Array<{ content: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, goal, initialWeeks } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const options =
      goal != null || (Array.isArray(initialWeeks) && initialWeeks.length > 0)
        ? {
            goal:
              typeof goal === 'number' && !Number.isNaN(goal) ? goal : undefined,
            initialWeeks: Array.isArray(initialWeeks)
              ? initialWeeks.map((row: any) => ({ content: String(row?.content ?? '') }))
              : undefined,
          }
        : undefined

    const id = await createProjectFile(title, options)
    return NextResponse.json({
      success: true,
      projectId: id,
      message: 'Project created successfully',
    })
  } catch (error) {
    console.error('Error creating project:', error)

    if (error instanceof Error) {
      if (error.message.includes('Project path not configured')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('does not exist')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

/**
 * PUT - 更新项目基本信息
 * body: { projectId: string, title?: string, goal?: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, goal } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const data: { title?: string; goal?: number } = {}
    if (title !== undefined && typeof title === 'string') data.title = title
    if (goal !== undefined && typeof goal === 'number' && !Number.isNaN(goal)) data.goal = goal

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'At least one of title or goal is required' },
        { status: 400 }
      )
    }

    const project = await updateProject(projectId, data)
    return NextResponse.json({
      success: true,
      project,
      message: 'Project updated successfully',
    })
  } catch (error) {
    console.error('Error updating project:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除项目
 * body: { projectId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    await deleteProject(projectId)
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - 更新项目某周项的 completed 状态（当前实现为只读回传）
 * body: { projectId: string, weekItemIndex: number, completed: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, weekItemIndex, completed } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    if (typeof weekItemIndex !== 'number' || weekItemIndex < 0) {
      return NextResponse.json(
        { error: 'weekItemIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'completed must be a boolean' },
        { status: 400 }
      )
    }

    const updatedProject = await updateWeekItemCompleted(
      projectId,
      weekItemIndex,
      completed
    )
    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Week item completed status updated successfully',
    })
  } catch (error) {
    console.error('Error updating week item completed status:', error)

    if (error instanceof Error) {
      if (error.message.includes('Project path not configured')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('does not exist')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('out of range')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update week item completed status' },
      { status: 500 }
    )
  }
}
