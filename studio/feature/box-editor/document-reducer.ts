import { nanoid } from 'nanoid'
import type { BoxEditorDocument, BoxNode, GridRect, Layer } from './types'
import {
  absToRelative,
  getAbsoluteRect,
  validateExistingNode,
  validatePlacedNode,
} from './layout'

export function createInitialDocument(): BoxEditorDocument {
  const layerId = nanoid()
  return {
    version: 1,
    layers: [{ id: layerId, name: 'Layer 1', order: 0 }],
    boxes: {},
  }
}

export function createBoxFromMarquee(
  doc: BoxEditorDocument,
  layerId: string,
  rect: GridRect,
  label = 'Box'
): BoxEditorDocument | null {
  if (!doc.layers.some((l) => l.id === layerId)) return null
  const id = nanoid()
  const node: BoxNode = {
    id,
    layerId,
    label,
    parentId: null,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
  }
  const draft: BoxEditorDocument = {
    ...doc,
    boxes: { ...doc.boxes, [id]: node },
  }
  if (!validateExistingNode(draft, id)) return null
  return draft
}

export function commitBoxPlacement(
  doc: BoxEditorDocument,
  boxId: string,
  newParentId: string | null,
  absTopLeft: { x: number; y: number }
): BoxEditorDocument | null {
  const node = doc.boxes[boxId]
  if (!node) return null

  const absRect: GridRect = {
    x: absTopLeft.x,
    y: absTopLeft.y,
    w: node.w,
    h: node.h,
  }

  let newRel: { x: number; y: number }
  if (newParentId == null) {
    newRel = { x: absRect.x, y: absRect.y }
  } else {
    const pAbs = getAbsoluteRect(doc, newParentId)
    if (!pAbs) return null
    newRel = absToRelative(absRect, pAbs)
  }

  if (
    !validatePlacedNode(doc, boxId, newParentId, newRel, {
      w: node.w,
      h: node.h,
    })
  ) {
    return null
  }

  return {
    ...doc,
    boxes: {
      ...doc.boxes,
      [boxId]: {
        ...node,
        parentId: newParentId,
        x: newRel.x,
        y: newRel.y,
      },
    },
  }
}

/** Resize in absolute grid space while keeping the node's current parent. */
export function commitBoxResize(
  doc: BoxEditorDocument,
  boxId: string,
  absRect: GridRect
): BoxEditorDocument | null {
  const node = doc.boxes[boxId]
  if (!node) return null
  const parentId = node.parentId

  let newRel: { x: number; y: number }
  if (parentId == null) {
    newRel = { x: absRect.x, y: absRect.y }
  } else {
    const pAbs = getAbsoluteRect(doc, parentId)
    if (!pAbs) return null
    newRel = absToRelative(absRect, pAbs)
  }

  if (
    !validatePlacedNode(doc, boxId, parentId, newRel, {
      w: absRect.w,
      h: absRect.h,
    })
  ) {
    return null
  }

  return {
    ...doc,
    boxes: {
      ...doc.boxes,
      [boxId]: {
        ...node,
        x: newRel.x,
        y: newRel.y,
        w: absRect.w,
        h: absRect.h,
      },
    },
  }
}

export function updateBoxLabel(
  doc: BoxEditorDocument,
  boxId: string,
  label: string
): BoxEditorDocument | null {
  const node = doc.boxes[boxId]
  if (!node) return null
  return {
    ...doc,
    boxes: {
      ...doc.boxes,
      [boxId]: { ...node, label },
    },
  }
}

export function renameLayer(
  doc: BoxEditorDocument,
  layerId: string,
  name: string
): BoxEditorDocument | null {
  const layers = doc.layers.map((l) =>
    l.id === layerId ? { ...l, name } : l
  )
  if (layers.every((l) => l.id !== layerId)) return null
  return { ...doc, layers }
}

export function addLayer(doc: BoxEditorDocument, name?: string): BoxEditorDocument {
  const maxOrder = doc.layers.reduce((m, l) => Math.max(m, l.order), -1)
  const layer: Layer = {
    id: nanoid(),
    name: name ?? `Layer ${doc.layers.length + 1}`,
    order: maxOrder + 1,
  }
  return { ...doc, layers: [...doc.layers, layer] }
}

export function removeLayer(
  doc: BoxEditorDocument,
  layerId: string
): BoxEditorDocument | null {
  if (doc.layers.length <= 1) return null
  const layers = doc.layers.filter((l) => l.id !== layerId)
  const boxesEntries = Object.entries(doc.boxes).filter(
    ([, b]) => b.layerId !== layerId
  )
  const boxes = Object.fromEntries(boxesEntries) as Record<string, BoxNode>
  return { ...doc, layers, boxes }
}

export function moveLayerOrder(
  doc: BoxEditorDocument,
  layerId: string,
  direction: -1 | 1
): BoxEditorDocument | null {
  const sorted = [...doc.layers].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((l) => l.id === layerId)
  if (idx < 0) return null
  const j = idx + direction
  if (j < 0 || j >= sorted.length) return null
  const a = sorted[idx]
  const b = sorted[j]
  const layers = doc.layers.map((l) => {
    if (l.id === a.id) return { ...l, order: b.order }
    if (l.id === b.id) return { ...l, order: a.order }
    return l
  })
  return { ...doc, layers }
}
