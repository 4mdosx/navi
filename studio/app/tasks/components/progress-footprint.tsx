'use client'

import { useMemo } from 'react'
import { startOfYear, eachDayOfInterval, format, startOfWeek } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageCardProps {
  total: number
  completed: number
  items: Array<{ date: Date; hasActivity: boolean; hasIcon?: boolean }>
}

function UsageCard({ total, completed, items }: UsageCardProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const formatTooltip = (date: Date) => {
    // 根据 total 判断类型：24 是今天，7 是本周，其他是今年
    if (total === 24) {
      return format(date, 'HH:mm')
    } else if (total === 7) {
      return format(date, 'MM/dd')
    } else {
      return format(date, 'MM/dd')
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="text-xs text-muted-foreground">
          {completed} / {total} ({percentage}%)
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-sm flex items-center justify-center",
                item.hasActivity
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border"
              )}
              title={item.date ? formatTooltip(item.date) : ''}
            >
              {item.hasIcon && item.hasActivity && (
                <CheckCircle2 className="w-2 h-2" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProgressFootprint() {
  // 计算今天已度过的小时数（按24小时）
  const todayUsage = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // 已度过的小时数：当前小时也算度过了（因为已经过了0分钟）
    const passedHours = currentHour + 1

    // 生成24个小时（0-23点）
    const hours: Array<{ date: Date; hasActivity: boolean; hasIcon?: boolean }> = []

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(todayStart)
      hourStart.setHours(hour, 0, 0, 0)

      // 已度过的小时显示为已完成
      const hasPassed = hour < passedHours

      hours.push({
        date: hourStart,
        hasActivity: hasPassed,
        hasIcon: hasPassed
      })
    }

    return {
      total: 24,
      completed: passedHours,
      items: hours
    }
  }, [])

  // 计算本周已度过的天数
  const weekUsage = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // 周一
    weekStart.setHours(0, 0, 0, 0)

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 计算从周一到今天过了多少天（包括今天）
    const diffTime = today.getTime() - weekStart.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 因为包括今天
    const passedDays = Math.min(Math.max(diffDays, 0), 7)

    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) // 周日
    })

    const dayActivities = weekDays.map((day, index) => {
      const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      // 已度过的天数显示为已完成
      const hasPassed = index < passedDays

      return {
        date: dayDate,
        hasActivity: hasPassed,
        hasIcon: hasPassed
      }
    })

    return {
      total: 7,
      completed: passedDays,
      items: dayActivities
    }
  }, [])

  // 计算今年已度过的周数
  const yearUsage = useMemo(() => {
    const now = new Date()
    const yearStart = startOfYear(now)
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1)

    // 计算今年的总周数
    let currentWeekStart = new Date(yearStart)

    // 找到第一个周一
    while (currentWeekStart.getDay() !== 1) {
      currentWeekStart.setDate(currentWeekStart.getDate() + 1)
    }

    const allWeeks: Date[] = []
    while (currentWeekStart < yearEnd) {
      allWeeks.push(new Date(currentWeekStart))
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    // 计算当前是第几周（从年初开始）
    const currentWeekStartDate = startOfWeek(now, { weekStartsOn: 1 })
    const currentWeekIndex = allWeeks.findIndex(weekStart => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return currentWeekStartDate >= weekStart && currentWeekStartDate <= weekEnd
    })

    // 已度过的周数：当前周也算度过了
    const passedWeeks = currentWeekIndex >= 0 ? currentWeekIndex + 1 : 0

    const weeks = allWeeks.map((weekStart, index) => {
      // 已度过的周显示为已完成
      const hasPassed = index < passedWeeks

      return {
        date: weekStart,
        hasActivity: hasPassed,
        hasIcon: hasPassed
      }
    })

    return {
      total: allWeeks.length,
      completed: passedWeeks,
      items: weeks
    }
  }, [])

  return (
    <div className="space-y-4">
      <UsageCard
        total={todayUsage.total}
        completed={todayUsage.completed}
        items={todayUsage.items}
      />
      <UsageCard
        total={weekUsage.total}
        completed={weekUsage.completed}
        items={weekUsage.items}
      />
      <UsageCard
        total={yearUsage.total}
        completed={yearUsage.completed}
        items={yearUsage.items}
      />
    </div>
  )
}
