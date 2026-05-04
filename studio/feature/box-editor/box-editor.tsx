'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Layers2,
  MousePointer2,
  Plus,
  Scaling,
  SquarePlus,
  Trash2,
  Upload,
} from 'lucide-react'
import type { EditorTool } from './types'
import {
  boxEditorLayerChipButtonProps,
  boxEditorMutedActionButtonClass,
  boxEditorOutlineActionButtonClass,
  boxEditorToolbarToolButtonProps,
} from './box-editor-button-variants'
import { useBoxEditorStore } from './box-editor-store'
import type { BoxNode } from './types'
import { BoxEditorCanvas } from './components/box-editor-canvas'
import { parseDocument, serializeDocument } from './schema'

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="pointer-events-none ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-slate-300 bg-slate-100 px-1 font-mono text-[10px] font-semibold text-slate-800 tabular-nums shadow-[0_1px_0_0_rgb(255_255_255)]">
      {children}
    </kbd>
  )
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  if (el.closest('[contenteditable="true"]')) return true
  return false
}

export function BoxEditor({ className }: { className?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const document = useBoxEditorStore((s) => s.document)
  const activeLayerId = useBoxEditorStore((s) => s.activeLayerId)
  const setActiveLayerId = useBoxEditorStore((s) => s.setActiveLayerId)
  const addLayerAction = useBoxEditorStore((s) => s.addLayerAction)
  const removeLayerAction = useBoxEditorStore((s) => s.removeLayerAction)
  const moveLayerOrderAction = useBoxEditorStore((s) => s.moveLayerOrderAction)
  const renameLayerAction = useBoxEditorStore((s) => s.renameLayerAction)
  const selectedBoxId = useBoxEditorStore((s) => s.selectedBoxId)
  const setLabel = useBoxEditorStore((s) => s.setLabel)
  const replaceDocument = useBoxEditorStore((s) => s.replaceDocument)
  const editorTool = useBoxEditorStore((s) => s.editorTool)
  const setEditorTool = useBoxEditorStore((s) => s.setEditorTool)
  const setSelectedBoxId = useBoxEditorStore((s) => s.setSelectedBoxId)

  const sortedLayers = [...document.layers].sort((a, b) => a.order - b.order)
  const selectedBox = selectedBoxId ? document.boxes[selectedBoxId] : null

  const ancestorChain = useMemo((): BoxNode[] => {
    if (!selectedBoxId) return []
    const chain: BoxNode[] = []
    let id: string | null = selectedBoxId
    const seen = new Set<string>()
    while (id) {
      if (seen.has(id)) break
      seen.add(id)
      const node: BoxNode | undefined = document.boxes[id]
      if (!node) break
      chain.push(node)
      id = node.parentId
    }
    chain.reverse()
    return chain
  }, [document.boxes, selectedBoxId])

  const descendantRows = useMemo(() => {
    if (!selectedBox) return [] as { node: BoxNode; depth: number }[]
    const layerId = selectedBox.layerId
    const sortKids = (boxes: BoxNode[]) =>
      [...boxes].sort(
        (a, b) =>
          a.label.localeCompare(b.label, undefined, {
            sensitivity: 'base',
          }) || a.id.localeCompare(b.id)
      )

    const rows: { node: BoxNode; depth: number }[] = []
    const queue: { node: BoxNode; depth: number }[] = sortKids(
      Object.values(document.boxes).filter(
        (b) => b.parentId === selectedBox.id && b.layerId === layerId
      )
    ).map((node) => ({ node, depth: 0 }))

    while (queue.length) {
      const { node, depth } = queue.shift()!
      rows.push({ node, depth })
      const next = sortKids(
        Object.values(document.boxes).filter(
          (b) => b.parentId === node.id && b.layerId === layerId
        )
      )
      for (const child of next) queue.push({ node: child, depth: depth + 1 })
    }
    return rows
  }, [document.boxes, selectedBox])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()
      let tool: EditorTool | null = null
      if (key === 'v') tool = 'select'
      else if (key === 'r') tool = 'create'
      else if (key === 's') tool = 'resize'
      else if (key === 'l') tool = 'layers'
      else if (e.key === '1') tool = 'select'
      else if (e.key === '2') tool = 'create'
      else if (e.key === '3') tool = 'resize'
      else if (e.key === '4') tool = 'layers'

      if (tool) {
        e.preventDefault()
        setEditorTool(tool)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setEditorTool])

  const onExport = () => {
    const doc = useBoxEditorStore.getState().document
    const text = serializeDocument(doc)
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = 'box-editor-document.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportClick = () => fileRef.current?.click()

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const doc = parseDocument(text)
        replaceDocument(doc)
      } catch {
        /* invalid file — ignore */
      }
    }
    reader.readAsText(f)
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col gap-2 overscroll-contain bg-gradient-to-b from-white to-slate-50 p-2 shadow-none',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Box 编辑器
          </h1>
          <p className="text-xs text-slate-500">
            快捷键{' '}
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">
              V
            </kbd>{' '}
            选择、
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">
              R
            </kbd>{' '}
            新建、
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">
              S
            </kbd>{' '}
            缩放、
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">
              L
            </kbd>{' '}
            图层；数字键 1–4 对应选择 / 新建 / 缩放 / 图层。
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
        role="toolbar"
        aria-label="画布工具"
      >
        <span className="px-1 text-xs font-medium text-slate-500">工具</span>
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            type="button"
            size="sm"
            {...boxEditorToolbarToolButtonProps(editorTool === 'select')}
            onClick={() => setEditorTool('select')}
          >
            <MousePointer2 className="h-4 w-4 shrink-0" />
            选择
            <Kbd>V</Kbd>
            <span className="sr-only">或数字键 1</span>
          </Button>
          <Button
            type="button"
            size="sm"
            {...boxEditorToolbarToolButtonProps(editorTool === 'create')}
            onClick={() => setEditorTool('create')}
          >
            <SquarePlus className="h-4 w-4 shrink-0" />
            新建 Box
            <Kbd>R</Kbd>
            <span className="sr-only">或数字键 2</span>
          </Button>
          <Button
            type="button"
            size="sm"
            {...boxEditorToolbarToolButtonProps(editorTool === 'resize')}
            onClick={() => setEditorTool('resize')}
          >
            <Scaling className="h-4 w-4 shrink-0" />
            缩放
            <Kbd>S</Kbd>
            <span className="sr-only">或数字键 3</span>
          </Button>
          <Button
            type="button"
            size="sm"
            {...boxEditorToolbarToolButtonProps(editorTool === 'layers')}
            onClick={() => setEditorTool('layers')}
          >
            <Layers2 className="h-4 w-4 shrink-0" />
            图层
            <Kbd>L</Kbd>
            <span className="sr-only">或数字键 4</span>
          </Button>
        </div>
      </div>

      {editorTool === 'layers' ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {
              '图层工具：画布为 3D 斜视便于查看叠层；此处可增删图层、调整顺序与重命名。编辑 Box 请切回「选择」或「新建 Box」。'
            }
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600">图层列表</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {sortedLayers.map((layer) => (
                <Button
                  key={layer.id}
                  type="button"
                  size="sm"
                  {...boxEditorLayerChipButtonProps(
                    layer.id === activeLayerId
                  )}
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  {layer.name}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={boxEditorMutedActionButtonClass}
                onClick={() => addLayerAction()}
              >
                <Plus className="h-4 w-4" />
                新建图层
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={boxEditorOutlineActionButtonClass}
                disabled={document.layers.length <= 1}
                onClick={() => removeLayerAction(activeLayerId)}
              >
                <Trash2 className="h-4 w-4" />
                删除当前
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={boxEditorOutlineActionButtonClass}
                title="上移一层；图层视图中当前层保持为高度与纵深基准 (0,0)"
                onClick={() => moveLayerOrderAction(activeLayerId, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={boxEditorOutlineActionButtonClass}
                title="下移一层；图层视图中当前层保持为高度与纵深基准 (0,0)"
                onClick={() => moveLayerOrderAction(activeLayerId, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-w-md space-y-1.5">
            <Label htmlFor="layer-rename">当前图层名称</Label>
            <Input
              id="layer-rename"
              value={
                document.layers.find((l) => l.id === activeLayerId)?.name ?? ''
              }
              onChange={(e) =>
                renameLayerAction(activeLayerId, e.target.value)
              }
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-xs font-medium text-slate-500">编辑层</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {sortedLayers.map((layer) => (
              <Button
                key={layer.id}
                type="button"
                size="sm"
                {...boxEditorLayerChipButtonProps(layer.id === activeLayerId)}
                onClick={() => setActiveLayerId(layer.id)}
              >
                {layer.name}
              </Button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">
            完整管理请按 <Kbd>L</Kbd> 进入图层工具
          </span>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        <BoxEditorCanvas />

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-sm font-medium text-slate-800">选中项</h2>
            {selectedBox ? (
              <div className="mt-3 space-y-3">
                <nav
                  className="flex flex-wrap items-center gap-0.5 text-xs"
                  aria-label="Box 层级路径"
                >
                  {ancestorChain.map((node, idx) => {
                    const isLast = idx === ancestorChain.length - 1
                    return (
                      <span
                        key={node.id}
                        className="flex min-w-0 max-w-full items-center gap-0.5"
                      >
                        {idx > 0 ? (
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-slate-300"
                            aria-hidden
                          />
                        ) : null}
                        {isLast ? (
                          <span
                            className="truncate font-medium text-slate-800"
                            title={node.label}
                          >
                            {node.label || '（无 label）'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="max-w-[10rem] truncate rounded px-1 py-0.5 text-left text-slate-600 underline decoration-slate-300 decoration-dotted underline-offset-2 hover:bg-slate-100 hover:text-slate-900"
                            title={node.label}
                            onClick={() => setSelectedBoxId(node.id)}
                          >
                            {node.label || '（无 label）'}
                          </button>
                        )}
                      </span>
                    )
                  })}
                </nav>
                  {descendantRows.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        子 Box
                      </p>
                      <ul className="mt-1.5 max-h-48 space-y-0.5 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/80 p-1">
                        {descendantRows.map(({ node: child, depth }) => (
                          <li key={child.id}>
                            <button
                              type="button"
                              className="flex w-full min-w-0 items-center justify-between gap-2 rounded py-1.5 pr-2 text-left text-xs text-slate-700 hover:bg-white hover:text-slate-900"
                              style={{ paddingLeft: 10 + depth * 14 }}
                              onClick={() => setSelectedBoxId(child.id)}
                            >
                              <span className="truncate font-medium">
                                {child.label || '（无 label）'}
                              </span>
                              <span className="shrink-0 font-mono tabular-nums text-[10px] text-slate-400">
                                {child.w}×{child.h}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                <div className="text-xs text-slate-500">
                  ID{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
                    {selectedBox.id.slice(0, 8)}…
                  </code>
                </div>
                <div className="text-xs text-slate-500">
                  尺寸{' '}
                  <span className="font-mono tabular-nums text-slate-700">
                    {selectedBox.w}×{selectedBox.h}
                  </span>
                  <span className="text-slate-400"> 格</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="box-label">Label</Label>
                  <Input
                    id="box-label"
                    value={selectedBox.label}
                    onChange={(e) =>
                      setLabel(selectedBox.id, e.target.value)
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                在画布上点击一个矩形以编辑 label。
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={boxEditorMutedActionButtonClass}
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
              导出 JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={boxEditorOutlineActionButtonClass}
              onClick={onImportClick}
            >
              <Upload className="h-4 w-4" />
              导入
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
