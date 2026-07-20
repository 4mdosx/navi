import { NextRequest, NextResponse } from 'next/server'
import {
  createTodo, deleteTodo, getTodo, listTodos, moveTodo, updateTodo, updateTodoContent,
} from '@/backstage/todo/todo.service'

type GatewayBody = { requestId?: string; operation?: string; arguments?: Record<string, any> }

export async function POST(request: NextRequest) {
  const body = await request.json() as GatewayBody
  const args = body.arguments ?? {}
  try {
    let data: unknown
    switch (body.operation) {
      case 'todo.create': data = await createTodo(args as any); break
      case 'todo.get': data = await getTodo(String(args.id)); break
      case 'todo.list': data = await listTodos(args as any); break
      case 'todo.update': data = await updateTodo(String(args.id), args as any); break
      case 'todo.update_content': data = await updateTodoContent(String(args.id), args as any); break
      case 'todo.create_subtask': data = await createTodo({ ...args, parentId: String(args.parentId) } as any); break
      case 'todo.move': data = await moveTodo(String(args.id), args as any); break
      case 'todo.delete':
        await deleteTodo(String(args.id), args.cascade === true)
        data = { deleted: true }
        break
      default: return NextResponse.json({ success: false, requestId: body.requestId, error: 'Unknown Todo operation' }, { status: 400 })
    }
    return NextResponse.json({ success: true, requestId: body.requestId, operation: body.operation, data })
  } catch (error) {
    return NextResponse.json({
      success: false, requestId: body.requestId, operation: body.operation,
      error: error instanceof Error ? error.message : 'Todo gateway failed',
    }, { status: 400 })
  }
}
