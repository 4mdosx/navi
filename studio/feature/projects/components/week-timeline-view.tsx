'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { format, getWeek, getYear, startOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { RotateCcw, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Project, WeekCommentRecord } from '@/types/projects'
import { getProjectStartWeek } from '@/backstage/projects/utils'
import { EditProjectDialog } from './edit-project-dialog'

interface WeekTimelineViewProps {
  projects: Project[]
  visibleWeeks?: number
  onProjectClick?: (project: Project) => void
  activeProjectId?: string | null
  onWeekClick?: (projectId: string, weekIndex: number) => void
  onProjectUpdate?: (
    projectId: string,
    values: { title: string; goal?: number }
  ) => Promise<void>
  onProjectDelete?: (projectId: string) => Promise<void>
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
  projects,
  visibleWeeks = 10,
  onProjectClick,
  activeProjectId,
  onWeekClick,
  onProjectUpdate,
  onProjectDelete,
}: WeekTimelineViewProps) {
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [weeksBefore, setWeeksBefore] = useState(visibleWeeks) // 当前周之前的周数
  const [weeksAfter, setWeeksAfter] = useState(visibleWeeks) // 当前周之后的周数
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const projectTimelineRefs = useRef<Map<string, HTMLDivElement>>(new Map())
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
    projectTimelineRefs.current.forEach((ref) => {
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
            projectTimelineRefs.current.forEach((ref) => {
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
              projectTimelineRefs.current.forEach((ref) => {
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
      projectTimelineRefs.current.forEach((ref) => {
        if (ref) {
          ref.scrollLeft = scrollContainerRef.current?.scrollLeft || 0
        }
      })
      isScrollingRef.current = false
    }, 500)
  }

  // 计算项目在时间线上的位置（基于 week 个数）
  const getProjectWeekRange = (project: Project) => {
    const projectStartWeek = getProjectStartWeek(project)
    const weekCount = project.week?.length || 0

    const startWeekIndex = weeks.findIndex(w => {
      return projectStartWeek >= w.weekStartDate && projectStartWeek <= w.weekEndDate
    })

    // 如果项目开始周不在当前显示范围内，返回空范围
    if (startWeekIndex < 0) {
      return {
        startIndex: -1,
        endIndex: -1,
        width: 0,
      }
    }

    const endWeekIndex = startWeekIndex + weekCount - 1

    return {
      startIndex: startWeekIndex,
      endIndex: Math.min(endWeekIndex, weeks.length - 1),
      width: weekCount,
    }
  }


  return (
    <div className="w-full">
      {/* 周标题行 - 支持无限滚动 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b-2 border-border mb-6">
        <div className="flex items-center">
          {/* 左侧固定列 */}
          <div className="w-56 flex-shrink-0 px-4 py-3 text-sm font-semibold text-muted-foreground flex items-center justify-between">
            <span>项目</span>
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

      {/* 项目进度条 */}
      <div className="space-y-4">
        {projects.map((project) => {
          const weekRange = getProjectWeekRange(project)
          const weekCount = project.week?.length || 0
          const isHovered = hoveredProjectId === project.id
          const isActive = activeProjectId === project.id

          const currentWeekIndexInTimeline = weeks.findIndex((w) => w.isCurrentWeek)
          const isCurrentWeekInProjectRange =
            currentWeekIndexInTimeline >= 0 &&
            weekRange.startIndex >= 0 &&
            currentWeekIndexInTimeline >= weekRange.startIndex &&
            currentWeekIndexInTimeline <= weekRange.endIndex
          const currentWeekNumber = isCurrentWeekInProjectRange
            ? currentWeekIndexInTimeline - weekRange.startIndex + 1
            : null
          const currentWeekData =
            currentWeekNumber != null ? project.week?.[currentWeekNumber - 1] : null
          const currentWeekScore =
            currentWeekData?.comment?.reduce(
              (s, c: WeekCommentRecord) => s + (Number(c.goal) || 0),
              0
            ) ?? 0
          const projectGoal = project.goal ?? 0

          return (
            <div
              key={project.id}
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
              onClick={() => onProjectClick?.(project)}
              onMouseEnter={() => setHoveredProjectId(project.id)}
              onMouseLeave={() => setHoveredProjectId(null)}
            >
              <div className="w-56 flex-shrink-0 px-4 py-4 border-r border-border/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
                    {project.title}
                  </h3>
                  {onProjectUpdate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 shrink-0 transition-opacity',
                        (isHovered || isActive) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        setProjectToEdit(project)
                        setEditDialogOpen(true)
                      }}
                      title="编辑项目"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {weekCount > 0 && (
                  <div className="flex flex-col gap-1 mt-3">
                    <span className="text-xs text-muted-foreground">
                      {currentWeekNumber != null
                        ? `第 ${currentWeekNumber}/${weekCount} 周`
                        : `共 ${weekCount} 周`}
                    </span>
                    {projectGoal > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {isCurrentWeekInProjectRange
                          ? `当前周 ${currentWeekScore}/${projectGoal} 分`
                          : `目标 ${projectGoal} 分/周`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 时间线区域 - 与标题行同步滚动 */}
              <div
                ref={(el) => {
                  if (el) {
                    projectTimelineRefs.current.set(project.id, el)
                  } else {
                    projectTimelineRefs.current.delete(project.id)
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
                  const isInProjectRange = weekRange.startIndex >= 0 &&
                    index >= weekRange.startIndex &&
                    index <= weekRange.endIndex

                  if (!isInProjectRange) {
                    return (
                      <div
                        key={`${week.year}-${week.weekNumber}-${index}`}
                        className="flex-shrink-0 w-32 border-r border-border/30 last:border-r-0"
                      />
                    )
                  }

                  const weekData = project.week?.[index - weekRange.startIndex]
                  const hasContent = weekData && (String(weekData.content || '').trim() !== '')
                  const weekGoalSum = weekData?.comment?.reduce(
                    (s, c: WeekCommentRecord) => s + (Number(c.goal) || 0),
                    0
                  ) ?? 0
                  const weekGoalTarget = project.goal ?? 0
                  const isWeekCompleted = weekGoalTarget > 0 && weekGoalSum >= weekGoalTarget
                  const showFilled = hasContent || isWeekCompleted
                  const isCurrentWeekInRange = week.isCurrentWeek && isInProjectRange

                  const projectWeekNumber = index - weekRange.startIndex + 1

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
                            'flex items-center justify-center cursor-pointer',
                            'hover:ring-2 hover:ring-primary/50 hover:ring-offset-1',
                            showFilled
                              ? cn(
                                  'bg-gradient-to-b from-blue-500 to-blue-600',
                                  'shadow-sm shadow-primary/20',
                                  isHovered && 'scale-105 shadow-md'
                                )
                              : 'bg-muted/40 border border-dashed border-muted-foreground/20',
                            isCurrentWeekInRange && 'ring-2 ring-primary/30 ring-offset-1'
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            onWeekClick?.(project.id, projectWeekNumber)
                          }}
                        >
                          {showFilled && (
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

      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={projectToEdit}
        onSubmit={async (values) => {
          if (projectToEdit && onProjectUpdate) {
            await onProjectUpdate(projectToEdit.id, values)
          }
        }}
        onDelete={onProjectDelete}
      />
    </div>
  )
}
