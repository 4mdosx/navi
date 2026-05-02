'use client'

import { create } from 'zustand'
import type { BoxEditorDocument, EditorTool, GridRect } from './types'
import {
  addLayer,
  commitBoxPlacement,
  commitBoxResize,
  createBoxFromMarquee,
  createInitialDocument,
  moveLayerOrder,
  removeLayer,
  renameLayer,
  updateBoxLabel,
} from './document-reducer'

export const DEFAULT_CELL_PX = 28
/** 可用编辑区格数（固定） */
export const GRID_CELLS_W = 32
export const GRID_CELLS_H = 20
/** 画布平移范围（像素），相对「可编辑区几何中心对齐视口中心」的偏移 */
export const CANVAS_PAN_MAX = 8192

function clampCanvasPan(v: number): number {
  return Math.max(-CANVAS_PAN_MAX, Math.min(CANVAS_PAN_MAX, Math.round(v)))
}

type BoxEditorState = {
  document: BoxEditorDocument
  activeLayerId: string
  /** 选择 / 新建 Box / 图层（斜视 + 图层管理） */
  editorTool: EditorTool
  setEditorTool: (tool: EditorTool) => void
  cellSizePx: number
  selectedBoxId: string | null
  setSelectedBoxId: (id: string | null) => void
  setCellSizePx: (n: number) => void
  /** 画布视口平移（px），各轴 ∈ [-CANVAS_PAN_MAX, CANVAS_PAN_MAX] */
  viewPanX: number
  viewPanY: number
  setViewPan: (x: number, y: number) => void
  setActiveLayerId: (id: string) => void
  replaceDocument: (doc: BoxEditorDocument) => void
  createMarqueeBox: (rect: GridRect, label?: string) => boolean
  commitPlacement: (
    boxId: string,
    parentId: string | null,
    absTopLeft: { x: number; y: number }
  ) => boolean
  commitResize: (boxId: string, absRect: GridRect) => boolean
  setLabel: (boxId: string, label: string) => void
  addLayerAction: () => void
  removeLayerAction: (layerId: string) => void
  renameLayerAction: (layerId: string, name: string) => void
  moveLayerOrderAction: (layerId: string, direction: -1 | 1) => void
}

function firstLayerId(doc: BoxEditorDocument): string {
  const sorted = [...doc.layers].sort((a, b) => a.order - b.order)
  return sorted[0]?.id ?? ''
}

export const useBoxEditorStore = create<BoxEditorState>((set, get) => {
  const initial = createInitialDocument()
  const initialLayer = firstLayerId(initial)

  return {
    document: initial,
    activeLayerId: initialLayer,
    editorTool: 'select',
    cellSizePx: DEFAULT_CELL_PX,
    viewPanX: 0,
    viewPanY: 0,
    selectedBoxId: null,

    setViewPan: (x, y) =>
      set({
        viewPanX: clampCanvasPan(x),
        viewPanY: clampCanvasPan(y),
      }),

    setEditorTool: (tool) => set({ editorTool: tool }),

    setSelectedBoxId: (id) => set({ selectedBoxId: id }),

    setCellSizePx: (n) =>
      set({ cellSizePx: Math.max(12, Math.min(64, Math.round(n))) }),

    setActiveLayerId: (id) => {
      const { document: doc } = get()
      if (!doc.layers.some((l) => l.id === id)) return
      set({ activeLayerId: id, selectedBoxId: null })
    },

    replaceDocument: (doc) => {
      const layerId = doc.layers.some((l) => l.id === get().activeLayerId)
        ? get().activeLayerId
        : firstLayerId(doc)
      set({
        document: doc,
        activeLayerId: layerId,
        selectedBoxId: null,
        editorTool: 'select',
        viewPanX: 0,
        viewPanY: 0,
      })
    },

    createMarqueeBox: (rect, label) => {
      const { document: doc, activeLayerId } = get()
      const next = createBoxFromMarquee(doc, activeLayerId, rect, label)
      if (!next) return false
      set({ document: next })
      return true
    },

    commitPlacement: (boxId, parentId, absTopLeft) => {
      const { document: doc } = get()
      const next = commitBoxPlacement(doc, boxId, parentId, absTopLeft)
      if (!next) return false
      set({ document: next })
      return true
    },

    commitResize: (boxId, absRect) => {
      const { document: doc } = get()
      const next = commitBoxResize(doc, boxId, absRect)
      if (!next) return false
      set({ document: next })
      return true
    },

    setLabel: (boxId, label) => {
      const next = updateBoxLabel(get().document, boxId, label)
      if (!next) return
      set({ document: next })
    },

    addLayerAction: () => {
      set({ document: addLayer(get().document) })
    },

    removeLayerAction: (layerId) => {
      const { document: doc, activeLayerId } = get()
      const next = removeLayer(doc, layerId)
      if (!next) return
      const newActive =
        activeLayerId === layerId ? firstLayerId(next) : activeLayerId
      set({
        document: next,
        activeLayerId: newActive,
        selectedBoxId: null,
      })
    },

    renameLayerAction: (layerId, name) => {
      const next = renameLayer(get().document, layerId, name)
      if (!next) return
      set({ document: next })
    },

    moveLayerOrderAction: (layerId, direction) => {
      const next = moveLayerOrder(get().document, layerId, direction)
      if (!next) return
      set({ document: next })
    },
  }
})
