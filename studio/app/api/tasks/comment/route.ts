import { NextRequest, NextResponse } from 'next/server'
import { addTodoCommentRecord, deleteTodoCommentRecord } from '@/backstage/tasks/tasks.service'

/**
 * POST - 添加记录到任务的 todo 项的 comment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, todoIndex, recordContent } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    if (typeof todoIndex !== 'number' || todoIndex < 0) {
      return NextResponse.json(
        { error: 'todoIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!recordContent || typeof recordContent !== 'string') {
      return NextResponse.json(
        { error: 'recordContent is required and must be a string' },
        { status: 400 }
      )
    }

    const updatedTask = await addTodoCommentRecord(taskId, todoIndex, recordContent)
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Comment record added successfully'
    })
  } catch (error) {
    console.error('Error adding comment record:', error)

    // 处理已知的错误类型
    if (error instanceof Error) {
      if (error.message.includes('Task path not configured')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('out of range')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to add comment record' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除任务的 todo 项的 comment 中的记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, todoIndex, recordIndex } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    if (typeof todoIndex !== 'number' || todoIndex < 0) {
      return NextResponse.json(
        { error: 'todoIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof recordIndex !== 'number' || recordIndex < 0) {
      return NextResponse.json(
        { error: 'recordIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    const updatedTask = await deleteTodoCommentRecord(taskId, todoIndex, recordIndex)
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Comment record deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting comment record:', error)

    // 处理已知的错误类型
    if (error instanceof Error) {
      if (error.message.includes('Task path not configured')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('out of range')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to delete comment record' },
      { status: 500 }
    )
  }
}
