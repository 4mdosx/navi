import { NextRequest, NextResponse } from 'next/server'
import { deleteTodo, getTodo, updateTodo } from '@/backstage/todo/todo.service'

type Context = { params: Promise<{ id: string }> }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Todo request failed'
const errorStatus = (error: unknown) => errorMessage(error).includes('not found') ? 404
  : errorMessage(error).includes('conflict') || errorMessage(error).includes('children') ? 409 : 400

export async function GET(_request: NextRequest, context: Context) {
  try {
    return NextResponse.json({ success: true, data: await getTodo((await context.params).id) })
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: errorStatus(error) })
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return NextResponse.json({
      success: true,
      data: await updateTodo((await context.params).id, await request.json()),
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: errorStatus(error) })
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await deleteTodo((await context.params).id, request.nextUrl.searchParams.get('cascade') === 'true')
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: errorStatus(error) })
  }
}
