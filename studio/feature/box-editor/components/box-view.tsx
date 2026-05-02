'use client'

import { cn } from '@/lib/utils'
import type { BoxNode } from '../types'

export type BoxViewProps = {
  node: BoxNode
  cellPx: number
  abs: { x: number; y: number; w: number; h: number }
  selected: boolean
  dropHighlight: 'none' | 'valid' | 'invalid'
  dragging: boolean
  /** Visual hint while dragging: placement currently valid or not. */
  dragPlacement?: 'neutral' | 'ok' | 'bad'
  /** When false, box is only clickable (e.g. create tool); no grab cursor. */
  dragEnabled?: boolean
  className?: string
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onPointerCancel?: (e: React.PointerEvent) => void
}

export function BoxView({
  node,
  cellPx,
  abs,
  selected,
  dropHighlight,
  dragging,
  dragPlacement = 'neutral',
  dragEnabled = true,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: BoxViewProps) {
  const left = abs.x * cellPx
  const top = abs.y * cellPx
  const width = abs.w * cellPx
  const height = abs.h * cellPx

  return (
    <div
      role="button"
      tabIndex={0}
      data-box-id={node.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        'absolute z-10 flex select-none flex-col rounded-lg border-2 bg-white/95 px-2 py-1.5 text-left shadow-sm transition-[box-shadow,opacity,transform] outline-none',
        className,
        'hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-400',
        selected && 'ring-2 ring-sky-500',
        dropHighlight === 'valid' &&
          'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]',
        dropHighlight === 'invalid' &&
          'border-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.35)]',
        dragging && 'cursor-grabbing opacity-90',
        !dragging && (dragEnabled ? 'cursor-grab' : 'cursor-pointer'),
        dragging && dragPlacement === 'ok' && 'ring-2 ring-emerald-400/80',
        dragging && dragPlacement === 'bad' && 'ring-2 ring-rose-500/90'
      )}
      style={{
        left,
        top,
        width,
        height,
        borderColor:
          dropHighlight === 'valid'
            ? 'rgb(16 185 129)'
            : dropHighlight === 'invalid'
              ? 'rgb(244 63 94)'
              : 'rgb(148 163 184)',
      }}
    >
      <span className="truncate text-xs font-semibold tracking-tight text-slate-700">
        {node.label}
      </span>
      <span className="mt-auto text-[10px] tabular-nums text-slate-400">
        {abs.w}×{abs.h}
      </span>
    </div>
  )
}
