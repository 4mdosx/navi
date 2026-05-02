/** Grid-aligned rectangle in cell units (integers). */
export type GridRect = {
  x: number
  y: number
  w: number
  h: number
}

export type BoxNode = {
  id: string
  layerId: string
  label: string
  parentId: string | null
  /** Position relative to parent origin (or layer origin if root). */
  x: number
  y: number
  w: number
  h: number
}

export type Layer = {
  id: string
  name: string
  /** Lower sorts first in UI list; 3D stack uses list order. */
  order: number
}

export type BoxEditorDocument = {
  version: 1
  layers: Layer[]
  boxes: Record<string, BoxNode>
}

/** Canvas interaction tool; stored globally in editor store. */
export type EditorTool = 'select' | 'create' | 'resize' | 'layers'

/** Which corner is being dragged when resizing on the grid (inclusive cell). */
export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'
