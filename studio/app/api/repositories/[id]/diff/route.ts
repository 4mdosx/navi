import { NextRequest, NextResponse } from 'next/server'
import { getRepositoryGitStatus } from '@/backstage/service/git.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    const gitStatus = await getRepositoryGitStatus(id)
    return NextResponse.json(gitStatus)
  } catch (error) {
    console.error('Error fetching repository diff:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch repository diff'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
