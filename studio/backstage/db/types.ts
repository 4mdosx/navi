// 数据库 schema 类型定义
// 这里需要根据实际的数据库表结构来定义
export interface Database {
  // 示例：根据实际表结构添加
  // users: {
  //   id: string
  //   email: string
  //   createdAt: Date
  // }
  // tasks: {
  //   id: string
  //   title: string
  //   ...
  // }
  settings: {
    key: string
    value: string
    updatedAt: Date
  }
}
