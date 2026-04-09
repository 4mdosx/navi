'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface PomodoroRecordFormProps {
  recordInput: string
  recordGoal: string
  isAddingRecord: boolean
  onRecordInputChange: (value: string) => void
  onRecordGoalChange: (value: string) => void
  onSubmit: () => Promise<void>
  onCancel: () => void
}

/** 番茄钟结束后填写记录并提交的表单 */
export function PomodoroRecordForm({
  recordInput,
  recordGoal,
  isAddingRecord,
  onRecordInputChange,
  onRecordGoalChange,
  onSubmit,
  onCancel,
}: PomodoroRecordFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">计时结束，填写本次记录：</p>
      <Textarea
        value={recordInput}
        onChange={(e) => onRecordInputChange(e.target.value)}
        placeholder="记录内容..."
        className="text-xs min-h-[80px]"
        disabled={isAddingRecord}
      />
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">得分</label>
        <input
          type="number"
          min={0}
          step={1}
          value={recordGoal}
          onChange={(e) => onRecordGoalChange(e.target.value)}
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={isAddingRecord || !recordInput.trim()}
          className="h-7 text-xs"
        >
          {isAddingRecord ? '提交中...' : '提交'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isAddingRecord}
          className="h-7 text-xs"
        >
          取消
        </Button>
      </div>
    </div>
  )
}
