'use client'

import { useState, useCallback } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'

export interface InitialWeekRow {
  id: number
  content: string
}

export interface CreateTaskFormValues {
  title: string
  goal: string
  initialWeeks: InitialWeekRow[]
}

let nextWeekId = 1
function createDefaultInitialWeeks(): InitialWeekRow[] {
  return Array.from({ length: 5 }, () => ({ id: nextWeekId++, content: '' }))
}

function getDefaultFormValues(): CreateTaskFormValues {
  return {
    title: '',
    goal: '',
    initialWeeks: createDefaultInitialWeeks(),
  }
}

export interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    title: string
    goal?: number
    initialWeeks?: Array<{ content: string }>
  }) => Promise<void>
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateTaskDialogProps) {
  const [form, setForm] = useState<CreateTaskFormValues>(getDefaultFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setForm(getDefaultFormValues())
    setError(null)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm()
      onOpenChange(next)
    },
    [onOpenChange, resetForm]
  )

  const addInitialWeek = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      initialWeeks: [...prev.initialWeeks, { id: nextWeekId++, content: '' }],
    }))
  }, [])

  const removeInitialWeek = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      initialWeeks: prev.initialWeeks.filter((_, i) => i !== index),
    }))
  }, [])

  const updateInitialWeek = useCallback((id: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      initialWeeks: prev.initialWeeks.map((row) =>
        row.id === id ? { ...row, content: value } : row
      ),
    }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      const title = form.title.trim()
      if (!title) {
        setError('请输入任务标题')
        return
      }

      setIsSubmitting(true)
      try {
        const goal =
          form.goal.trim() === ''
            ? undefined
            : Number(form.goal)
        const hasValidGoal =
          goal !== undefined && !Number.isNaN(goal)
        const initialWeeks = form.initialWeeks
          .map((row) => ({ content: row.content.trim() }))

        await onSubmit({
          title,
          goal: hasValidGoal ? goal : undefined,
          initialWeeks:
            initialWeeks.length > 0 ? initialWeeks : undefined,
        })
        handleOpenChange(false)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '创建任务失败，请重试'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [form, onSubmit, handleOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>创建任务</DialogTitle>
          <DialogDescription>
            填写任务信息。每周目标分数适用于所有周；默认 5 周，每周仅填内容，可增减周数。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="task-title">任务标题 *</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="例如：阅读、运动"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-goal">每周目标分数</Label>
            <Input
              id="task-goal"
              type="number"
              min={0}
              step={1}
              value={form.goal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, goal: e.target.value }))
              }
              placeholder="可选，本周期望得分"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>初始周</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInitialWeek}
                className="h-8"
              >
                <Plus className="h-3.5 w-3 mr-1" />
                添加一周
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              每周分数要求以任务「每周目标分数」为准；每行一周，仅填内容，可增减。
            </p>
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
              {form.initialWeeks.map((row, index) => (
                <div
                  key={row.id}
                  className="flex gap-2 rounded border border-border/50 p-2 bg-background items-start"
                >
                  <Textarea
                    placeholder={`第 ${index + 1} 周内容`}
                    value={row.content}
                    onChange={(e) =>
                      updateInitialWeek(row.id, e.target.value)
                    }
                    className="min-h-[60px] text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInitialWeek(index)}
                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
