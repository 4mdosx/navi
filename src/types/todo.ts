import { Todo as DatabaseTodo } from '@/modules/database/schema'

export type Todo = DatabaseTodo & {
  commit: TodoCommit[]
}

export type CommitType = 'action' | 'message' | 'checkpoint'
export type ActionType = 'create' | 'done' | 'update' | 'undo'

export type CheckpointStatus = 'pending' | 'open' | 'close' | 'done'

export interface TodoCommit {
  id: string
  message: string
  timestamp: string
  type: CommitType
  author: 'user' | 'system'
  raw: string // 原始输入内容，方便后续编辑
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any> // 存储额外的状态数据
  checkpointId?: string // 如果属于某个checkpoint
  status?: CheckpointStatus // 如果是checkpoint类型
  subCommits?: TodoCommit[] // 子commits（最多一层）
}
