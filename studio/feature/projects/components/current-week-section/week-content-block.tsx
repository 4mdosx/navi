'use client'

import { WeekMarkdownContent } from './markdown-content'

interface WeekContentBlockProps {
  /** 本周目标分数（project.goal） */
  goal: number | null | undefined
  /** 本周已得分数（comment 的 goal 累和） */
  weekGoalSum: number
  /** 是否已完成本周目标 */
  weekCompleted: boolean
  /** 周内容 Markdown */
  content: string | null | undefined
}

/** 本周目标摘要 + 周内容 Markdown 区域 */
export function WeekContentBlock({
  goal,
  weekGoalSum,
  weekCompleted,
  content,
}: WeekContentBlockProps) {
  return (
    <div className="text-sm p-3 rounded-md border bg-muted/50 border-border">
      <div className="flex items-center justify-between gap-2 mb-1">
        {goal != null && goal > 0 && (
          <span className="text-xs text-muted-foreground">
            本周目标 {goal} 分 · 已得 {weekGoalSum} 分
            {weekCompleted && ' · 已完成'}
          </span>
        )}
      </div>
      <div>
        {content && (
          <WeekMarkdownContent content={content} />
        )}
      </div>
    </div>
  )
}
