'use client'

import { cn } from '@/lib/utils'
import type { BoxNode, ResizeCorner } from '../types'

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
  /** 新建工具：正在从该 box 内拖拽选区时高亮宿主 */
  createMarqueeHostActive?: boolean
  /** 新建工具激活时，整块区域使用十字光标 */
  createTool?: boolean
  /** Show four corner hit targets for the resize tool (typically when selected). */
  showResizeHandles?: boolean
  /** Show w×h in grid cells (e.g. only in resize tool on the selected box). */
  showSize?: boolean
  onResizeHandlePointerDown?: (
    corner: ResizeCorner,
    e: React.PointerEvent
  ) => void
  onResizeHandlePointerMove?: (e: React.PointerEvent) => void
  onResizeHandlePointerUp?: (e: React.PointerEvent) => void
  onResizeHandlePointerCancel?: (e: React.PointerEvent) => void
  className?: string
  onDoubleClick?: (e: React.MouseEvent) => void
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
  createMarqueeHostActive = false,
  createTool = false,
  showResizeHandles = false,
  showSize = false,
  onResizeHandlePointerDown,
  onResizeHandlePointerMove,
  onResizeHandlePointerUp,
  onResizeHandlePointerCancel,
  className,
  onDoubleClick,
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
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        'absolute z-10 flex select-none flex-col rounded-lg border-2 bg-white/95 px-2 py-1.5 text-left shadow-sm transition-[box-shadow,opacity,transform] outline-none',
        className,
        'hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-400',
        selected && 'ring-2 ring-sky-500',
        createMarqueeHostActive &&
          'z-[15] ring-2 ring-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]',
        dropHighlight === 'valid' &&
          'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]',
        dropHighlight === 'invalid' &&
          'border-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.35)]',
        dragging && 'cursor-grabbing opacity-90',
        !dragging &&
          (createTool
            ? 'cursor-crosshair'
            : dragEnabled
              ? 'cursor-grab'
              : 'cursor-pointer'),
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
      {showSize && (
        <span className="mt-auto text-[10px] tabular-nums text-slate-400">
          {abs.w}×{abs.h}
        </span>
      )}
      {showResizeHandles &&
        onResizeHandlePointerDown &&
        onResizeHandlePointerMove &&
        onResizeHandlePointerUp && (
        <>
          {(
            [
              ['nw', '-left-1.5 -top-1.5', 'nwse-resize'],
              ['ne', '-right-1.5 -top-1.5', 'nesw-resize'],
              ['sw', '-left-1.5 -bottom-1.5', 'nesw-resize'],
              ['se', '-right-1.5 -bottom-1.5', 'nwse-resize'],
            ] as const
          ).map(([corner, pos, cursor]) => (
            <span
              key={corner}
              role="presentation"
              data-resize-handle={corner}
              className={`absolute z-20 h-3 w-3 rounded-sm border border-sky-600 bg-white shadow-sm touch-none ${pos}`}
              style={{ cursor }}
              onPointerDown={(e) => {
                e.stopPropagation()
                onResizeHandlePointerDown(corner, e)
              }}
              onPointerMove={onResizeHandlePointerMove}
              onPointerUp={onResizeHandlePointerUp}
              onPointerCancel={
                onResizeHandlePointerCancel ?? onResizeHandlePointerUp
              }
            />
          ))}
        </>
      )}
    </div>
  )
}
