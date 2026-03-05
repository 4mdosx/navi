'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import type { Task } from '@/types/tasks'

export interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSubmit: (values: { title: string; goal?: number }) => Promise<void>
  onDelete?: (taskId: string) => Promise<void>
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onSubmit,
  onDelete,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setGoal(task.goal != null ? String(task.goal) : '')
      setError(null)
    }
  }, [task, open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      const trimmedTitle = title.trim()
      if (!trimmedTitle) {
        setError('请输入任务标题')
        return
      }
      if (!task) return

      setIsSubmitting(true)
      try {
        const goalNum = goal.trim() === '' ? 0 : Number(goal) || 0
        await onSubmit({
          title: trimmedTitle,
          goal: goalNum,
        })
        onOpenChange(false)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '保存失败，请重试'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [title, goal, task, onSubmit, onOpenChange]
  )

  const handleDelete = useCallback(async () => {
    if (!task || !onDelete) return
    if (!window.confirm(`确定要删除任务「${task.title}」吗？此操作不可恢复。`)) {
      return
    }
    setError(null)
    setIsDeleting(true)
    try {
      await onDelete(task.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请重试')
    } finally {
      setIsDeleting(false)
    }
  }, [task, onDelete, onOpenChange])

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>编辑任务</DialogTitle>
          <DialogDescription>
            修改任务标题与每周目标分数。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title">任务标题 *</Label>
            <Input
              id="edit-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-task-goal">每周目标分数</Label>
            <Input
              id="edit-task-goal"
              type="number"
              min={0}
              step={1}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="可选"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="w-full sm:mr-auto order-2 sm:order-1">
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {isDeleting ? '删除中...' : '删除任务'}
                </Button>
              )}
            </div>
            <div className="flex gap-2 order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
