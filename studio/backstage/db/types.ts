// 数据库 schema 类型定义
// 这里需要根据实际的数据库表结构来定义
export interface Database {
  settings: {
    key: string
    value: string
    updatedAt: Date
  }
  repositories: {
    id: string
    name: string
    path: string
    createdAt: Date
  }
}
