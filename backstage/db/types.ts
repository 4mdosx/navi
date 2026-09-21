// 数据库 schema 类型定义（Kysely）
export interface Database {
  settings: {
    key: string
    value: string
    updatedAt: Date
  }
  todos: {
    id: string
    parentId: string | null
    sortOrder: number
    depth: number
    title: string
    description: string
    content: string
    status: string
    estimatedMinutes: number
    placement: string
    kind: string
    reviewAt: string | null
    activationCondition: string
    hour: number
    dayIndex: number | null
    weekStart: string | null
    version: number
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
    noteType: string
  }
  todo_time_links: {
    id: string
    todoId: string
    grain: string
    date: string
  }
  work_items:{id:string;sourceType:string;sourceId:string;title:string;description:string;scheduledDate:string;queueOrder:number;priority:string;state:string;plannedMinutes:number;createdAt:string;updatedAt:string}
  execution_sessions:{id:string;workItemId:string;startedAt:string;endedAt:string|null;endReason:string|null;note:string}
}
