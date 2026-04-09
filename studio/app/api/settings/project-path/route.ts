import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/backstage/model/settings.model'

const KEY = 'project_path'

/**
 * GET - 获取项目数据目录路径设置（键名 project_path）
 */
export async function GET() {
  try {
    const projectPath = await getSetting(KEY)
    return NextResponse.json({ projectPath: projectPath || null })
  } catch (error) {
    console.error('Error getting project path:', error)
    return NextResponse.json(
      { error: 'Failed to get project path' },
      { status: 500 }
    )
  }
}

/**
 * POST - 设置项目数据目录路径
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectPath } = body

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      )
    }

    await setSetting(KEY, projectPath)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting project path:', error)
    return NextResponse.json(
      { error: 'Failed to set project path' },
      { status: 500 }
    )
  }
}
