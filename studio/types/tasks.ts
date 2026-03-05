/** 单条 comment 记录：内容、时间、得分 */
export interface WeekCommentRecord {
  content: string
  updateAt: string // ISO 8601
  goal: number
}

/** 每周进度：id、内容、comment 列表（每条可带 goal，整周 comment 的 goal 累和 >= task.goal 即本周完成） */
export interface WeekItem {
  id: string // uuid
  content: string
  comment: WeekCommentRecord[]
}

export interface Task {
  id: string
  title: string
  goal?: number // 每周目标分数
  createdAt: string // ISO 8601 格式
  updatedAt: string // ISO 8601 格式
  week?: WeekItem[] // 每周进度记录
}
