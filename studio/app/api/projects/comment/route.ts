import { NextRequest, NextResponse } from 'next/server'
import {
  addWeekCommentRecord,
  deleteWeekCommentRecord,
} from '@/backstage/projects/projects.service'

/**
 * POST - 为项目某周添加 comment 记录
 * body: { projectId, weekItemIndex, recordContent, goal? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, weekItemIndex, recordContent, goal } = body

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

    if (!recordContent || typeof recordContent !== 'string') {
      return NextResponse.json(
        { error: 'recordContent is required and must be a string' },
        { status: 400 }
      )
    }

    const goalNum = typeof goal === 'number' && !Number.isNaN(goal) ? goal : 0
    const project = await addWeekCommentRecord(
      projectId,
      weekItemIndex,
      recordContent,
      goalNum
    )
    return NextResponse.json({
      success: true,
      project,
      message: 'Comment record added successfully',
    })
  } catch (error) {
    console.error('Error adding comment record:', error)

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
      { error: 'Failed to add comment record' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除项目某周 comment 中的一条记录
 * body: { projectId, weekItemIndex, recordIndex }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, weekItemIndex, recordIndex } = body

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

    if (typeof recordIndex !== 'number' || recordIndex < 0) {
      return NextResponse.json(
        { error: 'recordIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    const project = await deleteWeekCommentRecord(
      projectId,
      weekItemIndex,
      recordIndex
    )
    return NextResponse.json({
      success: true,
      project,
      message: 'Comment record deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting comment record:', error)

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
      { error: 'Failed to delete comment record' },
      { status: 500 }
    )
  }
}
