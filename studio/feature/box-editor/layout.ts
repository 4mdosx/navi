import type { BoxEditorDocument, BoxNode, GridRect } from './types'

export function toGridRect(node: Pick<BoxNode, 'x' | 'y' | 'w' | 'h'>): GridRect {
  return { x: node.x, y: node.y, w: node.w, h: node.h }
}

export function clampAbsRectToGrid(
  rect: GridRect,
  gridW: number,
  gridH: number
): GridRect {
  const w = Math.max(1, rect.w)
  const h = Math.max(1, rect.h)
  let x = rect.x
  let y = rect.y
  x = Math.max(0, Math.min(x, gridW - w))
  y = Math.max(0, Math.min(y, gridH - h))
  return { x, y, w, h }
}

export function rectsIntersect(a: GridRect, b: GridRect): boolean {
  const ax2 = a.x + a.w
  const ay2 = a.y + a.h
  const bx2 = b.x + b.w
  const by2 = b.y + b.h
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y
}

/** True if inner is fully contained in outer (inclusive edges). */
export function rectContains(outer: GridRect, inner: GridRect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  )
}

export function getBox(doc: BoxEditorDocument, id: string): BoxNode | undefined {
  return doc.boxes[id]
}

export function getAbsoluteRect(
  doc: BoxEditorDocument,
  boxId: string
): GridRect | null {
  const node = doc.boxes[boxId]
  if (!node) return null
  let x = node.x
  let y = node.y
  let pid = node.parentId
  while (pid) {
    const p = doc.boxes[pid]
    if (!p) return null
    x += p.x
    y += p.y
    pid = p.parentId
  }
  return { x, y, w: node.w, h: node.h }
}

export function isAncestor(
  doc: BoxEditorDocument,
  ancestorId: string,
  descendantId: string
): boolean {
  let pid: string | null = doc.boxes[descendantId]?.parentId ?? null
  const seen = new Set<string>()
  while (pid) {
    if (pid === ancestorId) return true
    if (seen.has(pid)) return false
    seen.add(pid)
    pid = doc.boxes[pid]?.parentId ?? null
  }
  return false
}

export function listDescendants(
  doc: BoxEditorDocument,
  rootId: string
): Set<string> {
  const out = new Set<string>()
  const stack: string[] = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    for (const b of Object.values(doc.boxes)) {
      if (b.parentId === id && !out.has(b.id)) {
        out.add(b.id)
        stack.push(b.id)
      }
    }
  }
  return out
}

/** Overlap allowed only if one node is a strict ancestor of the other (nesting). */
export function forbiddenOverlap(
  doc: BoxEditorDocument,
  idA: string,
  rectA: GridRect,
  idB: string,
  rectB: GridRect
): boolean {
  if (idA === idB) return false
  if (!rectsIntersect(rectA, rectB)) return false
  if (isAncestor(doc, idA, idB) || isAncestor(doc, idB, idA)) return false
  return true
}

export function hasForbiddenOverlapWithOthers(
  doc: BoxEditorDocument,
  movingId: string,
  movingAbs: GridRect,
  layerId: string
): boolean {
  const descendants = listDescendants(doc, movingId)
  descendants.add(movingId)
  for (const [id, node] of Object.entries(doc.boxes)) {
    if (node.layerId !== layerId) continue
    if (descendants.has(id)) continue
    const abs = getAbsoluteRect(doc, id)
    if (!abs) continue
    if (forbiddenOverlap(doc, movingId, movingAbs, id, abs)) return true
  }
  return false
}

/** Relative position of `childAbs` when parent is at `parentAbs`. */
export function absToRelative(
  childAbs: GridRect,
  parentAbs: GridRect
): { x: number; y: number } {
  return {
    x: childAbs.x - parentAbs.x,
    y: childAbs.y - parentAbs.y,
  }
}

export function canReparentAsChild(
  doc: BoxEditorDocument,
  childId: string,
  childAbs: GridRect,
  newParentId: string
): boolean {
  if (childId === newParentId) return false
  const parent = doc.boxes[newParentId]
  if (!parent) return false
  const child = doc.boxes[childId]
  if (!child || child.layerId !== parent.layerId) return false
  if (isAncestor(doc, childId, newParentId)) return false
  const pAbs = getAbsoluteRect(doc, newParentId)
  if (!pAbs) return false
  if (!rectContains(pAbs, childAbs)) return false
  return true
}

/** Validate moving a node (with possible new parent) and new relative x,y after move. */
export function validatePlacedNode(
  doc: BoxEditorDocument,
  boxId: string,
  newParentId: string | null,
  newRel: { x: number; y: number },
  dims: { w: number; h: number }
): boolean {
  const node = doc.boxes[boxId]
  if (!node) return false

  const draft: BoxEditorDocument = {
    ...doc,
    boxes: {
      ...doc.boxes,
      [boxId]: {
        ...node,
        parentId: newParentId,
        x: newRel.x,
        y: newRel.y,
        w: dims.w,
        h: dims.h,
      },
    },
  }

  const abs = getAbsoluteRect(draft, boxId)
  if (!abs) return false

  if (newParentId) {
    const pAbs = getAbsoluteRect(draft, newParentId)
    if (!pAbs) return false
    if (!rectContains(pAbs, abs)) return false
    if (isAncestor(doc, boxId, newParentId)) return false
  }

  if (hasForbiddenOverlapWithOthers(draft, boxId, abs, node.layerId))
    return false

  return true
}

/** Document already reflects the node's placement. */
export function validateExistingNode(doc: BoxEditorDocument, boxId: string): boolean {
  const node = doc.boxes[boxId]
  if (!node) return false
  return validatePlacedNode(
    doc,
    boxId,
    node.parentId,
    { x: node.x, y: node.y },
    { w: node.w, h: node.h }
  )
}

/** Deepest box under point (grid coords) in layer, excluding `ignoreId` subtree. */
export function hitTestTopMost(
  doc: BoxEditorDocument,
  layerId: string,
  gridX: number,
  gridY: number,
  ignoreSubtreeRoot: string | null
): string | null {
  const ignore = ignoreSubtreeRoot
    ? new Set([ignoreSubtreeRoot, ...listDescendants(doc, ignoreSubtreeRoot)])
    : new Set<string>()

  const candidates: string[] = []
  for (const node of Object.values(doc.boxes)) {
    if (node.layerId !== layerId) continue
    if (ignore.has(node.id)) continue
    const abs = getAbsoluteRect(doc, node.id)
    if (!abs) continue
    if (
      gridX >= abs.x &&
      gridY >= abs.y &&
      gridX < abs.x + abs.w &&
      gridY < abs.y + abs.h
    ) {
      candidates.push(node.id)
    }
  }

  if (candidates.length === 0) return null

  let best: string | null = null
  let bestDepth = -1
  for (const id of candidates) {
    let d = 0
    let pid: string | null = doc.boxes[id]?.parentId ?? null
    while (pid) {
      d++
      pid = doc.boxes[pid]?.parentId ?? null
    }
    if (d > bestDepth) {
      bestDepth = d
      best = id
    }
  }
  return best
}

/** Inclusive cell grid intersection; null if disjoint. */
export function intersectAbsRects(a: GridRect, b: GridRect): GridRect | null {
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w - 1, b.x + b.w - 1)
  const y1 = Math.min(a.y + a.h - 1, b.y + b.h - 1)
  if (x0 > x1 || y0 > y1) return null
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Axis-aligned marquee from two corner cells (inclusive), at least 1×1. */
export function rectFromDiagonalCells(
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

const MARQUEE_DRAFT_BOX_ID = '__marquee_draft__'

/** Whether a new box at absolute `absRect` could exist (overlap / containment rules). */
export function validateDraftNewBoxAt(
  doc: BoxEditorDocument,
  layerId: string,
  hostParentId: string | null,
  absRect: GridRect,
  label = 'Box'
): boolean {
  if (doc.boxes[MARQUEE_DRAFT_BOX_ID]) return false

  let node: BoxNode
  if (hostParentId) {
    const parent = doc.boxes[hostParentId]
    if (!parent || parent.layerId !== layerId) return false
    const pAbs = getAbsoluteRect(doc, hostParentId)
    if (!pAbs) return false
    const inter = intersectAbsRects(absRect, pAbs)
    if (!inter) return false
    const rel = absToRelative(inter, pAbs)
    node = {
      id: MARQUEE_DRAFT_BOX_ID,
      layerId,
      label,
      parentId: hostParentId,
      x: rel.x,
      y: rel.y,
      w: inter.w,
      h: inter.h,
    }
  } else {
    node = {
      id: MARQUEE_DRAFT_BOX_ID,
      layerId,
      label,
      parentId: null,
      x: absRect.x,
      y: absRect.y,
      w: absRect.w,
      h: absRect.h,
    }
  }

  const draft: BoxEditorDocument = {
    ...doc,
    boxes: { ...doc.boxes, [MARQUEE_DRAFT_BOX_ID]: node },
  }
  return validateExistingNode(draft, MARQUEE_DRAFT_BOX_ID)
}

export type MarqueeCreatePreview = {
  absRect: GridRect | null
  valid: boolean
}

/** Live preview for create-tool marquee: clamp to grid, clip to host parent, validate. */
export function previewMarqueeNewBox(
  doc: BoxEditorDocument,
  layerId: string,
  hostParentId: string | null,
  startGx: number,
  startGy: number,
  curGx: number,
  curGy: number,
  gridW: number,
  gridH: number
): MarqueeCreatePreview {
  const raw = rectFromDiagonalCells(startGx, startGy, curGx, curGy)
  let abs = clampAbsRectToGrid(raw, gridW, gridH)

  if (hostParentId) {
    const parent = doc.boxes[hostParentId]
    if (!parent || parent.layerId !== layerId) {
      return { absRect: null, valid: false }
    }
    const pAbs = getAbsoluteRect(doc, hostParentId)
    if (!pAbs) return { absRect: null, valid: false }
    const inter = intersectAbsRects(abs, pAbs)
    if (!inter) return { absRect: null, valid: false }
    abs = inter
  }

  const valid = validateDraftNewBoxAt(doc, layerId, hostParentId, abs)
  return { absRect: abs, valid }
}
