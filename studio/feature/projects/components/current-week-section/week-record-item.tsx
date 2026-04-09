'use client'

import { useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Trash2 } from 'lucide-react'
import type { WeekCommentRecord } from '@/types/projects'

interface WeekRecordItemProps {
  record: WeekCommentRecord
  index: number
  isDeleteOpen: boolean
  isDeleting: boolean
  isConfirmingDeleteRef: React.MutableRefObject<boolean>
  onDeleteClick: (index: number) => void
  onConfirmDelete: (index: number) => Promise<void>
  onCancelDelete: () => void
}

/** 单条周记录：内容、时间、得分 + 删除确认 Tooltip */
export function WeekRecordItem({
  record,
  index,
  isDeleteOpen,
  isDeleting,
  isConfirmingDeleteRef,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
}: WeekRecordItemProps) {
  return (
    <div className="text-xs text-muted-foreground/70 p-2 bg-muted/30 rounded border border-border/50 group/record">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="whitespace-pre-wrap">{record.content}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {record.updateAt && (
              <span className="text-[10px] text-muted-foreground/50">
                {format(new Date(record.updateAt), 'yyyy-MM-dd HH:mm')}
              </span>
            )}
            {record.goal != null && Number(record.goal) !== 0 && (
              <span className="text-[10px] text-muted-foreground">
                得分: {Number(record.goal)}
              </span>
            )}
          </div>
        </div>
        <TooltipProvider>
          <Tooltip
            open={isDeleteOpen}
            onOpenChange={(open) => {
              if (!open && !isConfirmingDeleteRef.current) {
                onCancelDelete()
              }
            }}
          >
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteClick(index)}
                disabled={isDeleting}
                className="h-6 w-6 p-0 opacity-0 group-hover/record:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="p-3 bg-white border border-border shadow-lg"
              onPointerDownOutside={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('button')) {
                  e.preventDefault()
                }
              }}
              onEscapeKeyDown={(e) => {
                if (!isConfirmingDeleteRef.current) {
                  onCancelDelete()
                } else {
                  e.preventDefault()
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                className="flex flex-col gap-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-medium text-foreground">
                  确定要删除这条记录吗？
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onConfirmDelete(index)
                    }}
                    disabled={isDeleting}
                    className="h-7 px-3 text-xs"
                  >
                    {isDeleting ? '删除中...' : '确认删除'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancelDelete()
                    }}
                    disabled={isDeleting}
                    className="h-7 px-3 text-xs"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
