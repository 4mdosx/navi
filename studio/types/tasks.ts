export interface Task {
  id: string
  title: string
  progress: number // 0-100
  createdAt: string // ISO 8601 格式
  updatedAt: string // ISO 8601 格式
  todo?: Array<Record<string, any>> // 任务待办项列表
}
