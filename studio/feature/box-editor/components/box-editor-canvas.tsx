'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useBoxEditorStore, GRID_CELLS_H, GRID_CELLS_W } from '../box-editor-store'
import {
  absToRelative,
  clampAbsRectToGrid,
  getAbsoluteRect,
  hitTestTopMost,
  validatePlacedNode,
} from '../layout'
import type { BoxEditorDocument, GridRect, ResizeCorner } from '../types'
import { BoxView } from './box-view'

function sortLayers(doc: BoxEditorDocument) {
  return [...doc.layers].sort((a, b) => a.order - b.order)
}

function depthOf(doc: BoxEditorDocument, id: string): number {
  let d = 0
  let pid: string | null = doc.boxes[id]?.parentId ?? null
  while (pid) {
    d++
    pid = doc.boxes[pid]?.parentId ?? null
  }
  return d
}

function boxesOnLayer(doc: BoxEditorDocument, layerId: string) {
  return Object.values(doc.boxes).filter((b) => b.layerId === layerId)
}

function clientToGrid(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  cellPx: number
): { gx: number; gy: number } | null {
  const r = el.getBoundingClientRect()
  const x = clientX - r.left
  const y = clientY - r.top
  if (x < 0 || y < 0 || x >= r.width || y >= r.height) return null
  return {
    gx: Math.floor(x / cellPx),
    gy: Math.floor(y / cellPx),
  }
}

function normalizeMarquee(
  ax: number,
  ay: number,
  bx: number,
  by: number
): GridRect {
  const x0 = Math.min(ax, bx)
  const y0 = Math.min(ay, by)
  const x1 = Math.max(ax, bx)
  const y1 = Math.max(ay, by)
  return {
    x: x0,
    y: y0,
    w: Math.max(1, x1 - x0 + 1),
    h: Math.max(1, y1 - y0 + 1),
  }
}

type MarqueeState = {
  pointerId: number
  startGx: number
  startGy: number
  curGx: number
  curGy: number
}

type DragState = {
  pointerId: number
  boxId: string
  docSnapshot: BoxEditorDocument
  grabDx: number
  grabDy: number
}

type ViewPanDrag = {
  pointerId: number
  startClientX: number
  startClientY: number
  originPanX: number
  originPanY: number
}

type ResizeDragState = {
  pointerId: number
  boxId: string
  corner: ResizeCorner
  startAbs: GridRect
  previewAbs: GridRect
  valid: boolean
}

function absRectFromResizeDrag(
  start: GridRect,
  corner: ResizeCorner,
  gx: number,
  gy: number
): GridRect {
  const { x, y, w, h } = start
  switch (corner) {
    case 'se':
      return normalizeMarquee(x, y, gx, gy)
    case 'nw':
      return normalizeMarquee(x + w - 1, y + h - 1, gx, gy)
    case 'ne':
      return normalizeMarquee(x, y + h - 1, gx, gy)
    case 'sw':
      return normalizeMarquee(x + w - 1, y, gx, gy)
    default:
      return start
  }
}

export function BoxEditorCanvas() {
  const panPlateRef = useRef<HTMLDivElement>(null)

  const document = useBoxEditorStore((s) => s.document)
  const activeLayerId = useBoxEditorStore((s) => s.activeLayerId)
  const cellSizePx = useBoxEditorStore((s) => s.cellSizePx)
  const selectedBoxId = useBoxEditorStore((s) => s.selectedBoxId)
  const setSelectedBoxId = useBoxEditorStore((s) => s.setSelectedBoxId)
  const setEditorTool = useBoxEditorStore((s) => s.setEditorTool)
  const editorTool = useBoxEditorStore((s) => s.editorTool)
  const createMarqueeBox = useBoxEditorStore((s) => s.createMarqueeBox)
  const commitPlacement = useBoxEditorStore((s) => s.commitPlacement)
  const commitResize = useBoxEditorStore((s) => s.commitResize)
  const viewPanX = useBoxEditorStore((s) => s.viewPanX)
  const viewPanY = useBoxEditorStore((s) => s.viewPanY)
  const setViewPan = useBoxEditorStore((s) => s.setViewPan)

  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [previewAbs, setPreviewAbs] = useState<GridRect | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropValid, setDropValid] = useState<boolean>(false)
  const [viewPanDrag, setViewPanDrag] = useState<ViewPanDrag | null>(null)
  const [resize, setResize] = useState<ResizeDragState | null>(null)
  /** Latest resize interaction (synced on down / move) so pointerup can commit without stale closure. */
  const resizeLiveRef = useRef<ResizeDragState | null>(null)

  useEffect(() => {
    setMarquee(null)
    setResize(null)
    resizeLiveRef.current = null
  }, [editorTool])

  const gridWpx = GRID_CELLS_W * cellSizePx
  const gridHpx = GRID_CELLS_H * cellSizePx

  const sortedLayers = useMemo(() => sortLayers(document), [document])

  const layersTool = editorTool === 'layers'
  /** 图层模式：仅绕 X 后仰（俯瞰 → 斜俯视桌台），无 rotateY，接近 2D 游戏地图视角 */
  const world3dTransform = layersTool ? 'rotateX(56deg)' : 'rotateX(0deg)'
  /**
   * 图层模式：以当前激活层为原点，其它层在 Y/Z 上错开（无水平偏移），减轻遮挡。
   */
  const layerGapLayers = 256
  const layerXStaggerPx = 0
  const layerYStaggerPx = 72
  const interactive = !layersTool

  const activeSortedIndex = useMemo(() => {
    const j = sortedLayers.findIndex((l) => l.id === activeLayerId)
    return j < 0 ? 0 : j
  }, [sortedLayers, activeLayerId])

  /** 图层模式：渲染全部层；编辑模式：只渲染当前编辑层（避免看到其它层的 Box） */
  const layersToRender = useMemo(() => {
    if (layersTool) return sortedLayers
    const active = sortedLayers.find((l) => l.id === activeLayerId)
    return active ? [active] : sortedLayers
  }, [layersTool, sortedLayers, activeLayerId])

  const resolveDropTarget = useCallback((dragBoxId: string, abs: GridRect) => {
    const doc = useBoxEditorStore.getState().document
    const node = doc.boxes[dragBoxId]
    if (!node) return { parentId: null as string | null, valid: false }
    const cx = Math.floor(abs.x + abs.w / 2)
    const cy = Math.floor(abs.y + abs.h / 2)
    const id = hitTestTopMost(doc, activeLayerId, cx, cy, dragBoxId)
    if (!id || id === dragBoxId) {
      const ok = validatePlacedNode(
        doc,
        dragBoxId,
        null,
        { x: abs.x, y: abs.y },
        { w: node.w, h: node.h }
      )
      return { parentId: null as string | null, valid: ok }
    }
    const pAbs = getAbsoluteRect(doc, id)
    if (!pAbs) return { parentId: null as string | null, valid: false }
    const rel = { x: abs.x - pAbs.x, y: abs.y - pAbs.y }
    const ok = validatePlacedNode(doc, dragBoxId, id, rel, {
      w: node.w,
      h: node.h,
    })
    return { parentId: id, valid: ok }
  }, [activeLayerId])

  const gridHitTarget = () => panPlateRef.current

  const onWorldPointerDown = (e: React.PointerEvent) => {
    if (!interactive || !gridHitTarget()) return
    if (e.button !== 0) return
    const t = e.target as HTMLElement | null
    if (t?.closest('[data-box-id]')) return

    if (editorTool !== 'create') {
      setSelectedBoxId(null)
      return
    }

    const g = clientToGrid(gridHitTarget()!, e.clientX, e.clientY, cellSizePx)
    if (!g) return
    setMarquee({
      pointerId: e.pointerId,
      startGx: g.gx,
      startGy: g.gy,
      curGx: g.gx,
      curGy: g.gy,
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedBoxId(null)
  }

  const onWorldPointerMove = (e: React.PointerEvent) => {
    if (!marquee || !gridHitTarget()) return
    if (e.pointerId !== marquee.pointerId) return
    const g = clientToGrid(gridHitTarget()!, e.clientX, e.clientY, cellSizePx)
    if (!g) return
    setMarquee((m) => (m ? { ...m, curGx: g.gx, curGy: g.gy } : m))
  }

  const onWorldPointerUp = (e: React.PointerEvent) => {
    if (!gridHitTarget()) return
    if (marquee && e.pointerId === marquee.pointerId) {
      const rect = normalizeMarquee(
        marquee.startGx,
        marquee.startGy,
        marquee.curGx,
        marquee.curGy
      )
      const clamped = clampAbsRectToGrid(rect, GRID_CELLS_W, GRID_CELLS_H)
      createMarqueeBox(clamped)
      setMarquee(null)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* noop */
      }
    }
  }

  const onBoxDoubleClick = (boxId: string, e: React.MouseEvent) => {
    if (!interactive) return
    e.stopPropagation()
    e.preventDefault()
    const doc = useBoxEditorStore.getState().document
    const node = doc.boxes[boxId]
    if (!node || node.layerId !== activeLayerId) return
    setSelectedBoxId(boxId)
    setEditorTool('resize')
  }

  const onBoxPointerDown = (boxId: string, e: React.PointerEvent) => {
    if (!interactive || !gridHitTarget()) return
    if (e.button !== 0) return
    e.stopPropagation()
    const docSnap = structuredClone(
      useBoxEditorStore.getState().document
    ) as BoxEditorDocument
    const node = docSnap.boxes[boxId]
    if (!node || node.layerId !== activeLayerId) return
    const abs = getAbsoluteRect(docSnap, boxId)
    if (!abs) return
    const g = clientToGrid(gridHitTarget()!, e.clientX, e.clientY, cellSizePx)
    if (!g) return
    setSelectedBoxId(boxId)
    if (editorTool !== 'select') {
      setDropTargetId(null)
      setDropValid(true)
      return
    }
    setDrag({
      pointerId: e.pointerId,
      boxId,
      docSnapshot: docSnap,
      grabDx: g.gx - abs.x,
      grabDy: g.gy - abs.y,
    })
    setPreviewAbs(abs)
    setDropTargetId(null)
    setDropValid(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onBoxPointerMove = (boxId: string, e: React.PointerEvent) => {
    if (!drag || drag.boxId !== boxId || !gridHitTarget()) return
    if (e.pointerId !== drag.pointerId) return
    const g = clientToGrid(gridHitTarget()!, e.clientX, e.clientY, cellSizePx)
    if (!g) return
    const node = drag.docSnapshot.boxes[boxId]
    if (!node) return
    const raw: GridRect = {
      x: g.gx - drag.grabDx,
      y: g.gy - drag.grabDy,
      w: node.w,
      h: node.h,
    }
    const abs = clampAbsRectToGrid(raw, GRID_CELLS_W, GRID_CELLS_H)
    setPreviewAbs(abs)
    const { parentId, valid } = resolveDropTarget(boxId, abs)
    setDropTargetId(parentId)
    setDropValid(valid)
  }

  const onResizeHandlePointerDown = (
    boxId: string,
    corner: ResizeCorner,
    e: React.PointerEvent
  ) => {
    if (!interactive || !gridHitTarget()) return
    if (editorTool !== 'resize') return
    if (e.button !== 0) return
    const docSnap = structuredClone(
      useBoxEditorStore.getState().document
    ) as BoxEditorDocument
    const node = docSnap.boxes[boxId]
    if (!node || node.layerId !== activeLayerId) return
    const abs = getAbsoluteRect(docSnap, boxId)
    if (!abs) return
    setSelectedBoxId(boxId)
    const next: ResizeDragState = {
      pointerId: e.pointerId,
      boxId,
      corner,
      startAbs: { ...abs },
      previewAbs: { ...abs },
      valid: true,
    }
    resizeLiveRef.current = next
    setResize(next)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onResizeHandlePointerMove = (e: React.PointerEvent) => {
    setResize((r) => {
      if (!r || !gridHitTarget()) return r
      if (e.pointerId !== r.pointerId) return r
      const g = clientToGrid(gridHitTarget()!, e.clientX, e.clientY, cellSizePx)
      if (!g) return r
      const raw = absRectFromResizeDrag(r.startAbs, r.corner, g.gx, g.gy)
      const abs = clampAbsRectToGrid(raw, GRID_CELLS_W, GRID_CELLS_H)
      const doc = useBoxEditorStore.getState().document
      const node = doc.boxes[r.boxId]
      if (!node) return r
      const parentId = node.parentId
      let rel: { x: number; y: number }
      if (parentId == null) {
        rel = { x: abs.x, y: abs.y }
      } else {
        const pAbs = getAbsoluteRect(doc, parentId)
        if (!pAbs) return r
        rel = absToRelative(abs, pAbs)
      }
      const ok = validatePlacedNode(doc, r.boxId, parentId, rel, {
        w: abs.w,
        h: abs.h,
      })
      const updated = { ...r, previewAbs: abs, valid: ok }
      resizeLiveRef.current = updated
      return updated
    })
  }

  const onResizeHandlePointerUp = (e: React.PointerEvent) => {
    const r = resizeLiveRef.current
    if (r && e.pointerId === r.pointerId && r.valid) {
      commitResize(r.boxId, r.previewAbs)
    }
    resizeLiveRef.current = null
    setResize(null)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const onBoxPointerUp = (boxId: string, e: React.PointerEvent) => {
    if (!drag || drag.boxId !== boxId) return
    if (e.pointerId !== drag.pointerId) return
    const abs = previewAbs
    const doc = useBoxEditorStore.getState().document
    const node = doc.boxes[boxId]
    if (abs && node) {
      const centerGx = Math.floor(abs.x + abs.w / 2)
      const centerGy = Math.floor(abs.y + abs.h / 2)
      const parentHit = hitTestTopMost(
        doc,
        activeLayerId,
        centerGx,
        centerGy,
        boxId
      )
      const parentId =
        parentHit && parentHit !== boxId ? parentHit : null
      const rel =
        parentId == null
          ? { x: abs.x, y: abs.y }
          : (() => {
              const pAbs = getAbsoluteRect(doc, parentId)
              if (!pAbs) return { x: abs.x, y: abs.y }
              return { x: abs.x - pAbs.x, y: abs.y - pAbs.y }
            })()
      const ok =
        parentId == null
          ? validatePlacedNode(doc, boxId, null, rel, {
              w: node.w,
              h: node.h,
            })
          : validatePlacedNode(doc, boxId, parentId, rel, {
              w: node.w,
              h: node.h,
            })
      if (ok) {
        commitPlacement(boxId, parentId, { x: abs.x, y: abs.y })
      }
    }
    setDrag(null)
    setPreviewAbs(null)
    setDropTargetId(null)
    setDropValid(true)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const marqueeRect =
    editorTool === 'create' &&
    marquee &&
    normalizeMarquee(marquee.startGx, marquee.startGy, marquee.curGx, marquee.curGy)

  const onScrollportPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    const { viewPanX: px, viewPanY: py } = useBoxEditorStore.getState()
    setViewPanDrag({
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originPanX: px,
      originPanY: py,
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onScrollportPointerMove = (e: React.PointerEvent) => {
    if (!viewPanDrag || e.pointerId !== viewPanDrag.pointerId) return
    const nx =
      viewPanDrag.originPanX + (e.clientX - viewPanDrag.startClientX)
    const ny =
      viewPanDrag.originPanY + (e.clientY - viewPanDrag.startClientY)
    setViewPan(nx, ny)
  }

  const onScrollportPointerUp = (e: React.PointerEvent) => {
    if (!viewPanDrag || e.pointerId !== viewPanDrag.pointerId) return
    setViewPanDrag(null)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  /** 滚轮平移画布（无滚动条），避免穿透到页面默认滚动 */
  const onScrollportWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const { viewPanX: px, viewPanY: py, setViewPan } = useBoxEditorStore.getState()
    setViewPan(px - e.deltaX, py - e.deltaY)
  }

  return (
    <div
      data-scrollport
      title="中键拖拽或滚轮平移画布；默认可编辑区几何中心对齐视口中心，周围为不可编辑留白"
      className={cn(
        'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-xl border border-slate-200 bg-slate-100 shadow-inner',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        viewPanDrag && 'cursor-grabbing'
      )}
      onPointerDown={onScrollportPointerDown}
      onPointerMove={onScrollportPointerMove}
      onPointerUp={onScrollportPointerUp}
      onPointerCancel={onScrollportPointerUp}
      onWheel={onScrollportWheel}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={panPlateRef}
          className="absolute box-border"
          style={{
            left: '50%',
            top: '50%',
            width: gridWpx,
            minWidth: gridWpx,
            height: gridHpx,
            transform: `translate3d(${-gridWpx / 2 + viewPanX}px, ${-gridHpx / 2 + viewPanY}px, 0)`,
            perspective: layersTool ? 1500 : 2200,
            perspectiveOrigin: layersTool ? '50% 55%' : '50% 35%',
          }}
        >
          <div
            className={cn(
              'relative box-border h-full w-full transform-gpu transition-[transform] duration-500 ease-[cubic-bezier(0.22,0.99,0.36,1)]',
              !layersTool && 'origin-top',
              !interactive && 'pointer-events-none'
            )}
            style={{
              transformStyle: 'preserve-3d',
              transform: world3dTransform,
              ...(layersTool ? { transformOrigin: '50% 76%' } : {}),
            }}
          >
          {layersToRender.map((layer) => {
            const docIndex = sortedLayers.findIndex((l) => l.id === layer.id)
            const isActive = layer.id === activeLayerId
            const boxes = boxesOnLayer(document, layer.id).sort(
              (a, b) => depthOf(document, a.id) - depthOf(document, b.id)
            )

            const rel = docIndex - activeSortedIndex
            const z = layersTool ? rel * layerGapLayers : 0
            const xOff = layersTool ? rel * layerXStaggerPx : 0
            const yOff = layersTool ? rel * layerYStaggerPx : 0

            return (
              <div
                key={layer.id}
                className="absolute inset-0 rounded-lg will-change-transform"
                style={{
                  transform: `translate3d(${xOff}px, ${yOff}px, ${z}px)`,
                  transformStyle: 'preserve-3d',
                  transition: layersTool
                    ? 'transform 520ms cubic-bezier(0.25, 0.9, 0.32, 1)'
                    : undefined,
                  pointerEvents:
                    interactive && isActive ? 'auto' : 'none',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-0 rounded-lg"
                  style={{
                    backgroundColor: 'transparent',
                    backgroundImage:
                      'radial-gradient(circle, rgb(148 163 184) 1.1px, transparent 1.2px)',
                    backgroundSize: `${cellSizePx}px ${cellSizePx}px`,
                  }}
                  aria-hidden
                />
                {isActive && interactive && (
                  <div
                    className={cn(
                      'absolute inset-0 z-0',
                      editorTool === 'create' && 'cursor-crosshair',
                      (editorTool === 'select' || editorTool === 'resize') &&
                        'cursor-default'
                    )}
                    onPointerDown={onWorldPointerDown}
                    onPointerMove={onWorldPointerMove}
                    onPointerUp={onWorldPointerUp}
                    onPointerCancel={onWorldPointerUp}
                  />
                )}
                {boxes.map((b) => {
                  const abs0 =
                    getAbsoluteRect(document, b.id) ?? toFallbackAbs(b)
                  const isDragged = drag?.boxId === b.id
                  const isResizing = resize?.boxId === b.id
                  const abs =
                    isDragged && previewAbs
                      ? previewAbs
                      : isResizing
                        ? resize.previewAbs
                        : abs0
                  const dropHighlight =
                    dropTargetId === b.id
                      ? dropValid
                        ? 'valid'
                        : 'invalid'
                      : 'none'
                  return (
                    <BoxView
                      key={b.id}
                      node={b}
                      cellPx={cellSizePx}
                      abs={abs}
                      selected={selectedBoxId === b.id}
                      dropHighlight={dropHighlight}
                      dragging={isDragged || isResizing}
                      dragEnabled={editorTool === 'select'}
                      dragPlacement={
                        isResizing
                          ? resize.valid
                            ? 'ok'
                            : 'bad'
                          : isDragged
                            ? dropValid
                              ? 'ok'
                              : 'bad'
                            : 'neutral'
                      }
                      showResizeHandles={
                        editorTool === 'resize' && selectedBoxId === b.id
                      }
                      showSize={
                        editorTool === 'resize' && selectedBoxId === b.id
                      }
                      onResizeHandlePointerDown={(corner, ev) =>
                        onResizeHandlePointerDown(b.id, corner, ev)
                      }
                      onResizeHandlePointerMove={onResizeHandlePointerMove}
                      onResizeHandlePointerUp={onResizeHandlePointerUp}
                      onResizeHandlePointerCancel={onResizeHandlePointerUp}
                      onDoubleClick={(e) => onBoxDoubleClick(b.id, e)}
                      onPointerDown={(e) => onBoxPointerDown(b.id, e)}
                      onPointerMove={(e) => onBoxPointerMove(b.id, e)}
                      onPointerUp={(e) => onBoxPointerUp(b.id, e)}
                      onPointerCancel={(e) => onBoxPointerUp(b.id, e)}
                    />
                  )
                })}
              </div>
            )
          })}

          {marqueeRect && interactive && editorTool === 'create' && (
            <div
              className="pointer-events-none absolute border-2 border-sky-500 bg-sky-400/25"
              style={{
                left: marqueeRect.x * cellSizePx,
                top: marqueeRect.y * cellSizePx,
                width: marqueeRect.w * cellSizePx,
                height: marqueeRect.h * cellSizePx,
              }}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

function toFallbackAbs(b: { x: number; y: number; w: number; h: number }) {
  return { x: b.x, y: b.y, w: b.w, h: b.h }
}
