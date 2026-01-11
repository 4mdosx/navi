import { NextRequest, NextResponse } from 'next/server'
import { readTasksFromFiles, createTaskFile } from '@/backstage/tasks/tasks.service'

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
 * POST - 创建任务模板文件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    const filePath = await createTaskFile(title, description)
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
