import { NextRequest, NextResponse } from 'next/server'
import {
  getAllRepositories,
  addRepository,
  deleteRepository,
} from '@/backstage/model/repository.model'

export async function GET() {
  try {
    const repositories = await getAllRepositories()
    return NextResponse.json(repositories)
  } catch (error) {
    console.error('Error fetching repositories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path } = body
    console.log('path', path)

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required and must be a string' },
        { status: 400 }
      )
    }

    const repository = await addRepository(path)
    return NextResponse.json(repository, { status: 201 })
  } catch (error) {
    console.error('Error adding repository:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to add repository'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      )
    }

    await deleteRepository(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repository:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete repository'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}
