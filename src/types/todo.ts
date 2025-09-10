import { Todo as DatabaseTodo } from '@/modules/database/schema'

export type Todo = DatabaseTodo & {
  commit: TodoCommit[]
}

export type CommitType = 'create' | 'message' | 'done' | 'checkpoint'

export type CheckpointStatus = 'open' | 'close' | 'done'

export interface TodoCommit {
  id: string
  message: string
  timestamp: string
  type: CommitType
  author: 'user' | 'system'
  raw: string // 原始输入内容，方便后续编辑
  payload: Record<string, object> // 存储额外的状态数据
  checkpointId?: string // 如果属于某个checkpoint
  status?: CheckpointStatus // 如果是checkpoint类型
  subCommits?: TodoCommit[] // 子commits（最多一层）
}
