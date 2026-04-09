// 数据库 schema 类型定义（Kysely）
export interface Database {
  settings: {
    key: string
    value: string
    updatedAt: Date
  }
  projects: {
    id: string
    title: string
    progress: number
    goal: number
    createdAt: string
    updatedAt: string
  }
  project_todos: {
    projectId: string
    weekItemIndex: number
    id: string
    content: string
    comment: string
  }
}
