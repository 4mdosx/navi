'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { format, getWeek, getYear, startOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Task } from '@/types/tasks'
import { getTaskStartWeek } from '@/backstage/tasks/utils'

interface WeekTimelineViewProps {
  tasks: Task[]
  visibleWeeks?: number // 可见的周数，默认20周
  onTaskClick?: (task: Task) => void
  activeTaskId?: string | null // 激活的任务 ID
}

interface WeekData {
  date: Date
  year: number
  weekNumber: number // ISO周数
  isCurrentWeek: boolean
  weekStartDate: Date
  weekEndDate: Date
}

export function WeekTimelineView({
  tasks,
  visibleWeeks = 10,
  onTaskClick,
  activeTaskId
}: WeekTimelineViewProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [weeksBefore, setWeeksBefore] = useState(visibleWeeks) // 当前周之前的周数
  const [weeksAfter, setWeeksAfter] = useState(visibleWeeks) // 当前周之后的周数
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const taskTimelineRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const isScrollingRef = useRef(false)
  const hasInitializedRef = useRef(false) // 标记是否已初始化滚动
  const now = new Date()
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })

  // 生成周数据（从最早周到现在+未来周）
  const generateWeeks = (weeksBeforeCount: number, weeksAfterCount: number): WeekData[] => {
    const weeks: WeekData[] = []
    const startWeek = subWeeks(currentWeekStart, weeksBeforeCount)
    const totalWeeks = weeksBeforeCount + weeksAfterCount + 1 // +1 是当前周

    for (let i = 0; i < totalWeeks; i++) {
      const weekDate = addWeeks(startWeek, i)
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      weeks.push({
        date: weekDate,
        year: getYear(weekDate),
        weekNumber: getWeek(weekDate, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
        isCurrentWeek: isSameWeek(weekDate, now, { weekStartsOn: 1 }),
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
      })
    }

    return weeks
  }

  // 生成显示的周数据
  const weeks = useMemo(() => {
    return generateWeeks(weeksBefore, weeksAfter)
  }, [weeksBefore, weeksAfter])

  // 同步滚动处理
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return

    const target = e.currentTarget
    const scrollLeft = target.scrollLeft
    const scrollWidth = target.scrollWidth
    const clientWidth = target.clientWidth

    // 同步所有任务时间线的滚动
    taskTimelineRefs.current.forEach((ref) => {
      if (ref) {
        ref.scrollLeft = scrollLeft
      }
    })

    // 检查是否滚动到左边缘（需要加载更多之前的周）
    if (scrollLeft < 200 && weeksBefore < visibleWeeks * 10) {
      const weekWidth = 128 // 每个周的宽度 (w-32 = 8rem = 128px)
      const addedWeeks = visibleWeeks
      const scrollOffset = addedWeeks * weekWidth
      const currentScroll = scrollLeft

      setWeeksBefore(prev => {
        // 在下一帧更新滚动位置，保持视觉连续性
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = currentScroll + scrollOffset
            taskTimelineRefs.current.forEach((ref) => {
              if (ref) {
                ref.scrollLeft = scrollContainerRef.current?.scrollLeft || 0
              }
            })
          }
        })
        return prev + addedWeeks
      })
    }

    // 检查是否滚动到右边缘（需要加载更多之后的周）
    if (scrollLeft + clientWidth > scrollWidth - 200 && weeksAfter < visibleWeeks * 10) {
      setWeeksAfter(prev => prev + visibleWeeks)
    }
  }

  // 初始化时滚动到当前周-2周
  useEffect(() => {
    if (hasInitializedRef.current) return // 只执行一次

    if (scrollContainerRef.current && weeks.length > 0) {
      const currentWeekIndex = weeks.findIndex(w => w.isCurrentWeek)
      if (currentWeekIndex >= 0) {
        // 计算目标周索引（当前周-2周）
        const targetWeekIndex = Math.max(0, currentWeekIndex + 4)
        // 使用 requestAnimationFrame 确保 DOM 已渲染
        requestAnimationFrame(() => {
          const weekElement = scrollContainerRef.current?.children[targetWeekIndex] as HTMLElement
          if (weekElement && scrollContainerRef.current) {
            const scrollPosition = weekElement.offsetLeft - scrollContainerRef.current.clientWidth / 2 + weekElement.clientWidth / 2
            isScrollingRef.current = true
            scrollContainerRef.current.scrollTo({
              left: scrollPosition,
              behavior: 'smooth'
            })
            // 同步所有任务时间线
            setTimeout(() => {
              taskTimelineRefs.current.forEach((ref) => {
                if (ref && scrollContainerRef.current) {
                  ref.scrollLeft = scrollContainerRef.current.scrollLeft
                }
              })
              isScrollingRef.current = false
              hasInitializedRef.current = true // 标记已初始化
            }, 500)
          }
        })
      }
    }
  }, [weeks]) // 当周数据准备好时执行

  // 重置到当前周
  const handleResetToCurrentWeek = () => {
    if (!scrollContainerRef.current) return

    const currentWeekIndex = weeks.findIndex(w => w.isCurrentWeek)
    if (currentWeekIndex < 0) return

    const weekElement = scrollContainerRef.current.children[currentWeekIndex] as HTMLElement
    if (!weekElement) return

    const scrollPosition = weekElement.offsetLeft - scrollContainerRef.current.clientWidth / 2 + weekElement.clientWidth / 2

    isScrollingRef.current = true
    scrollContainerRef.current.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    })

    // 同步所有任务时间线
    setTimeout(() => {
      taskTimelineRefs.current.forEach((ref) => {
        if (ref) {
          ref.scrollLeft = scrollContainerRef.current?.scrollLeft || 0
        }
      })
      isScrollingRef.current = false
    }, 500)
  }

  // 计算任务在时间线上的位置（基于 todo 个数）
  const getTaskWeekRange = (task: Task) => {
    const taskStartWeek = getTaskStartWeek(task)
    const todoCount = task.todo?.length || 0

    // 找到任务开始的周索引
    const startWeekIndex = weeks.findIndex(w => {
      return taskStartWeek >= w.weekStartDate && taskStartWeek <= w.weekEndDate
    })

    // 如果任务开始周不在当前显示范围内，返回空范围
    if (startWeekIndex < 0) {
      return {
        startIndex: -1,
        endIndex: -1,
        width: 0,
      }
    }

    // 基于 todo 个数计算结束周索引
    const endWeekIndex = startWeekIndex + todoCount - 1

    return {
      startIndex: startWeekIndex,
      endIndex: Math.min(endWeekIndex, weeks.length - 1),
      width: todoCount,
    }
  }


  return (
    <div className="w-full">
      {/* 周标题行 - 支持无限滚动 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b-2 border-border mb-6">
        <div className="flex items-center">
          {/* 左侧固定列 */}
          <div className="w-56 flex-shrink-0 px-4 py-3 text-sm font-semibold text-muted-foreground flex items-center justify-between">
            <span>任务</span>
            {/* 重置到当前周按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleResetToCurrentWeek}
              title="返回到当前周"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* 可滚动的周列 */}
          <div
            ref={scrollContainerRef}
            className="flex-1 flex overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            onScroll={handleScroll}
          >
            {weeks.map((week, index) => (
              <div
                key={`${week.year}-${week.weekNumber}-${index}`}
                className={cn(
                  'flex-shrink-0 w-32 px-3 py-3 text-center border-r border-border/50 last:border-r-0',
                  'transition-colors',
                  week.isCurrentWeek
                    ? 'bg-primary/15 border-primary/30 font-semibold'
                    : 'hover:bg-muted/30'
                )}
              >
                {/* 年份 */}
                <div className={cn(
                  'text-xs font-bold mb-0.5',
                  week.isCurrentWeek ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {week.year}年
                </div>
                {/* 周数 */}
                <div className={cn(
                  'text-xs font-medium',
                  week.isCurrentWeek ? 'text-primary' : 'text-foreground'
                )}>
                  第{week.weekNumber}周
                </div>
                {/* 日期范围 */}
                <div className={cn(
                  'text-xs mt-0.5',
                  week.isCurrentWeek ? 'text-primary/80' : 'text-muted-foreground/70'
                )}>
                  {format(week.weekStartDate, 'MM/dd')} - {format(week.weekEndDate, 'MM/dd')}
                </div>
                {week.isCurrentWeek && (
                  <div className="mt-1.5 h-0.5 bg-primary rounded-full mx-auto w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务进度条 - 改进样式和交互 */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const weekRange = getTaskWeekRange(task)
          const progressPercent = task.progress
          const isHovered = hoveredTaskId === task.id
          const isActive = activeTaskId === task.id

          return (
            <div
              key={task.id}
              className={cn(
                'group relative flex items-center',
                'rounded-lg border transition-all duration-200',
                'hover:shadow-md hover:shadow-primary/5',
                isActive
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : isHovered
                  ? 'border-primary/30 bg-primary/5 shadow-md'
                  : 'border-border/50 bg-card hover:border-border',
                'cursor-pointer'
              )}
              onClick={() => onTaskClick?.(task)}
              onMouseEnter={() => setHoveredTaskId(task.id)}
              onMouseLeave={() => setHoveredTaskId(null)}
            >
              {/* 任务信息区域 - 改进布局 */}
              <div className="w-56 flex-shrink-0 px-4 py-4 border-r border-border/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
                    {task.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  {/* 进度条 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full bg-blue-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间线区域 - 与标题行同步滚动 */}
              <div
                ref={(el) => {
                  if (el) {
                    taskTimelineRefs.current.set(task.id, el)
                  } else {
                    taskTimelineRefs.current.delete(task.id)
                  }
                }}
                className="flex-1 flex relative h-16 overflow-x-auto scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
                onScroll={(e) => {
                  // 同步到标题行
                  if (scrollContainerRef.current && !isScrollingRef.current) {
                    scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft
                  }
                }}
              >
                {weeks.map((week, index) => {
                  const isInTaskRange = weekRange.startIndex >= 0 &&
                    index >= weekRange.startIndex &&
                    index <= weekRange.endIndex

                  if (!isInTaskRange) {
                    return (
                      <div
                        key={`${week.year}-${week.weekNumber}-${index}`}
                        className="flex-shrink-0 w-32 border-r border-border/30 last:border-r-0"
                      />
                    )
                  }

                  // 计算这个周在任务中的相对位置（0-1）
                  const weekRelativePosition = (index - weekRange.startIndex + 1) / weekRange.width
                  // 如果任务进度已经超过这个周的位置，则显示为已完成
                  const expectedProgressAtWeek = weekRelativePosition * 100
                  const isCompleted = expectedProgressAtWeek <= progressPercent
                  const isCurrentWeekInRange = week.isCurrentWeek && isInTaskRange

                  return (
                    <div
                      key={`${week.year}-${week.weekNumber}-${index}`}
                      className={cn(
                        'flex-shrink-0 w-32 border-r border-border/30 last:border-r-0 relative',
                        'flex items-center justify-center group/week',
                        isCurrentWeekInRange && 'bg-primary/5'
                      )}
                    >
                      <div className="w-full px-1">
                        <div
                          className={cn(
                            'w-full h-8 rounded-md transition-all duration-300',
                            'flex items-center justify-center',
                            isCompleted
                              ? cn(
                                  'bg-gradient-to-b from-blue-500 to-blue-600',
                                  'shadow-sm shadow-primary/20',
                                  isHovered && 'scale-105 shadow-md'
                                )
                              : 'bg-muted/40 border border-dashed border-muted-foreground/20',
                            isCurrentWeekInRange && 'ring-2 ring-primary/30 ring-offset-1'
                          )}
                        >
                          {isCompleted && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                          )}
                        </div>
                        {isCurrentWeekInRange && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
