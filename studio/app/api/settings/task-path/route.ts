import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { join } from 'path'
import { getSetting, setSetting } from '@/backstage/model/settings.model'

/**
 * GET - 获取任务路径设置
 */
export async function GET() {
  try {
    const taskPath = await getSetting('task_path')
    return NextResponse.json({ taskPath: taskPath || null })
  } catch (error) {
    console.error('Error getting task path:', error)
    return NextResponse.json(
      { error: 'Failed to get task path' },
      { status: 500 }
    )
  }
}

/**
 * POST - 设置任务路径
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskPath } = body

    if (!taskPath || typeof taskPath !== 'string') {
      return NextResponse.json(
        { error: 'taskPath is required' },
        { status: 400 }
      )
    }

    await setSetting('task_path', taskPath)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting task path:', error)
    return NextResponse.json(
      { error: 'Failed to set task path' },
      { status: 500 }
    )
  }
}
