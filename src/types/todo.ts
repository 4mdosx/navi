import { Todo as DatabaseTodo } from '@/modules/database/schema'

export type Todo = DatabaseTodo & {
  commit: TodoCommit[]
}

export interface TodoCommit {
  id: string
  message: string
  timestamp: string
  action?: 'create' | 'update' | 'delete'
  type: 'user' | 'system'
}
