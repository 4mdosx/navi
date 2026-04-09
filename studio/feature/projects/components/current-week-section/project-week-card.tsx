'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Project, WeekCommentRecord } from '@/types/projects'
import {
  getPomodoroSession,
  savePomodoroSessionToStorage,
  POMODORO_DURATION_MS,
  type PomodoroSession,
} from './pomodoro-utils'
import { PomodoroCountdown } from './pomodoro-countdown'
import { PomodoroRecordForm } from './pomodoro-record-form'
import { WeekContentBlock } from './week-content-block'
import { WeekRecordItem } from './week-record-item'

export interface ProjectWeekCardProps {
  project: Project
  weekNumber: number
  weekStartDate: Date
  onAddRecord?: (
    projectId: string,
    weekItemIndex: number,
    recordContent: string,
    goal?: number
  ) => Promise<void>
  onDeleteRecord?: (
    projectId: string,
    weekItemIndex: number,
    recordIndex: number
  ) => Promise<void>
}

/** 单项目的单周卡片：周内容、记录列表、番茄钟、添加记录 */
export function ProjectWeekCard({
  project,
  weekNumber,
  onAddRecord,
  onDeleteRecord,
}: ProjectWeekCardProps) {
  const weekItemIndex = weekNumber - 1
  const weekItem = project.week?.[weekItemIndex]

  const [isAddingRecord, setIsAddingRecord] = useState(false)
  const [isDeletingRecord, setIsDeletingRecord] = useState<number | null>(null)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null
  )
  const isConfirmingDeleteRef = useRef(false)
  const [recordInput, setRecordInput] = useState('')
  const [recordGoal, setRecordGoal] = useState<string>('1')

  const [pomodoroSession, setPomodoroSession] =
    useState<PomodoroSession | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    setPomodoroSession(getPomodoroSession())
  }, [])

  const isPomodoroForThisCard =
    pomodoroSession?.projectId === project.id &&
    pomodoroSession?.weekNumber === weekNumber
  const pomodoroEndTime = isPomodoroForThisCard
    ? pomodoroSession.startTime + POMODORO_DURATION_MS
    : 0
  const pomodoroRemainingMs = Math.max(0, pomodoroEndTime - Date.now())
  const isPomodoroRunning = isPomodoroForThisCard && pomodoroRemainingMs > 0
  const isPomodoroEnded = isPomodoroForThisCard && pomodoroRemainingMs === 0

  useEffect(() => {
    if (!isPomodoroForThisCard || pomodoroRemainingMs <= 0) return
    const interval = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [isPomodoroForThisCard, pomodoroRemainingMs])

  const handleStartPomodoro = useCallback(() => {
    const session: PomodoroSession = {
      startTime: Date.now(),
      projectId: project.id,
      weekNumber,
    }
    savePomodoroSessionToStorage(session)
    setPomodoroSession(session)
  }, [project.id, weekNumber])

  const handleAddRecord = useCallback(async () => {
    if (!onAddRecord || !recordInput.trim()) return
    setIsAddingRecord(true)
    try {
      const goalNum = recordGoal.trim() === '' ? 1 : Number(recordGoal) || 1
      await onAddRecord(project.id, weekItemIndex, recordInput.trim(), goalNum)
      setRecordInput('')
      setRecordGoal('1')
      savePomodoroSessionToStorage(null)
      setPomodoroSession(null)
    } catch (error) {
      console.error('Error adding record:', error)
      alert(error instanceof Error ? error.message : '添加记录失败，请重试')
    } finally {
      setIsAddingRecord(false)
    }
  }, [project.id, weekItemIndex, recordInput, recordGoal, onAddRecord])

  const handleCancelPomodoroForm = useCallback(() => {
    savePomodoroSessionToStorage(null)
    setPomodoroSession(null)
    setRecordInput('')
    setRecordGoal('1')
  }, [])

  const handleDeleteClick = useCallback((recordIndex: number) => {
    setPendingDeleteIndex(recordIndex)
  }, [])

  const handleConfirmDelete = useCallback(
    async (recordIndex: number) => {
      if (!onDeleteRecord) return
      isConfirmingDeleteRef.current = true
      setIsDeletingRecord(recordIndex)
      setPendingDeleteIndex(null)
      try {
        await onDeleteRecord(project.id, weekItemIndex, recordIndex)
      } catch (error) {
        console.error('Error deleting record:', error)
        alert(error instanceof Error ? error.message : '删除记录失败，请重试')
      } finally {
        setIsDeletingRecord(null)
        isConfirmingDeleteRef.current = false
      }
    },
    [project.id, weekItemIndex, onDeleteRecord]
  )

  const handleCancelDelete = useCallback(() => {
    setPendingDeleteIndex(null)
  }, [])

  const commentRecords: WeekCommentRecord[] = useMemo(
    () => (Array.isArray(weekItem?.comment) ? weekItem.comment : []),
    [weekItem?.comment]
  )
  const weekGoalSum = useMemo(
    () => commentRecords.reduce((s, r) => s + (Number(r.goal) || 0), 0),
    [commentRecords]
  )
  const projectGoal = project.goal ?? 0
  const weekCompleted = projectGoal > 0 && weekGoalSum >= projectGoal

  if (!weekItem) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground py-4 text-center">
            第{weekNumber}周还没有记录
          </div>
        </CardContent>
      </Card>
    )
  }

  const addRecordButton = (
    <Button
      size="sm"
      variant="outline"
      onClick={handleStartPomodoro}
      className="h-7 text-xs w-full"
    >
      <Plus className="h-3 w-3 mr-1" />
      添加记录
    </Button>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                <CardTitle className="text-base">{project.title}</CardTitle>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPomodoroRunning ? (
          <PomodoroCountdown remainingMs={pomodoroRemainingMs} />
        ) : isPomodoroEnded ? (
          <PomodoroRecordForm
            recordInput={recordInput}
            recordGoal={recordGoal}
            isAddingRecord={isAddingRecord}
            onRecordInputChange={setRecordInput}
            onRecordGoalChange={setRecordGoal}
            onSubmit={handleAddRecord}
            onCancel={handleCancelPomodoroForm}
          />
        ) : (
          <>
            <WeekContentBlock
              goal={project.goal}
              weekGoalSum={weekGoalSum}
              weekCompleted={weekCompleted}
              content={weekItem.content}
            />
            {commentRecords.length > 0 ? (
              <div className="mt-2 space-y-2">
                <div className="space-y-1.5">
                  {commentRecords.map((record, index) => (
                    <WeekRecordItem
                      key={index}
                      record={record}
                      index={index}
                      isDeleteOpen={pendingDeleteIndex === index}
                      isDeleting={isDeletingRecord === index}
                      isConfirmingDeleteRef={isConfirmingDeleteRef}
                      onDeleteClick={handleDeleteClick}
                      onConfirmDelete={handleConfirmDelete}
                      onCancelDelete={handleCancelDelete}
                    />
                  ))}
                </div>
                {addRecordButton}
              </div>
            ) : null}
            {commentRecords.length === 0 && (
              <div className="mt-2">{addRecordButton}</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
