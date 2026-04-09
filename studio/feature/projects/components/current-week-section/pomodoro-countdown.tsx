'use client'

import { Timer } from 'lucide-react'

interface PomodoroCountdownProps {
  remainingMs: number
}

/** 番茄钟倒计时展示 */
export function PomodoroCountdown({ remainingMs }: PomodoroCountdownProps) {
  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)
  const displaySeconds = String(seconds).padStart(2, '0')

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <Timer className="h-12 w-12 text-muted-foreground" />
      <div className="text-2xl font-mono font-medium tabular-nums">
        {minutes}:{displaySeconds}
      </div>
      <p className="text-xs text-muted-foreground">
        专注中，还剩 {Math.ceil(remainingMs / 60000)} 分钟
      </p>
    </div>
  )
}
