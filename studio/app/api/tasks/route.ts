import { NextRequest, NextResponse } from 'next/server'
import { readTasksFromFiles, createTaskFile, updateTask, deleteTask, updateTodoCompleted, addTodoCommentRecord } from '@/backstage/tasks/tasks.service'

/**
 * GET - 读取目录下的所有 markdown 文件并解析
 */
export async function GET() {
  try {
    const tasks = await readTasksFromFiles()
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error reading tasks from files:', error)

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
    }

    return NextResponse.json(
      { error: 'Failed to read tasks from files' },
      { status: 500 }
    )
  }
}

/**
 * POST - 创建任务
 * body: { title: string, goal?: number, initialWeeks?: Array<{ content: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, goal, initialWeeks } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
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

    const filePath = await createTaskFile(title, options)
    return NextResponse.json({
      success: true,
      filePath,
      message: 'Task file created successfully'
    })
  } catch (error) {
    console.error('Error creating task file:', error)

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
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create task file' },
      { status: 500 }
    )
  }
}

/**
 * PUT - 更新任务基本信息（标题、每周目标分数）
 * body: { taskId: string, title?: string, goal?: number }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, title, goal } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required' },
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

    const task = await updateTask(taskId, data)
    return NextResponse.json({
      success: true,
      task,
      message: 'Task updated successfully',
    })
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除任务
 * body: { taskId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    await deleteTask(taskId)
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - 更新任务的 todo 项的 completed 状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, todoIndex, completed } = body

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

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'completed must be a boolean' },
        { status: 400 }
      )
    }

    const updatedTask = await updateTodoCompleted(taskId, todoIndex, completed)
    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Todo completed status updated successfully'
    })
  } catch (error) {
    console.error('Error updating todo completed status:', error)

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
      { error: 'Failed to update todo completed status' },
      { status: 500 }
    )
  }
}
