'use client'

import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

type VaultNode = {
  name: string
  path: string
  isDirectory: boolean
}

type TreeResponse = {
  path: string
  children: VaultNode[]
}

type FileResponse = {
  path: string
  content: string
  fileType: 'markdown' | 'image' | 'text'
  mimeType?: string
}

type LoadedMap = Record<string, VaultNode[]>
type ErrorResponse = { error: string }

export default function ObsidianVaultPage() {
  const [treeMap, setTreeMap] = useState<LoadedMap>({})
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['.']))
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<FileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingTreePath, setLoadingTreePath] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)

  const rootChildren = useMemo(() => treeMap['.'] ?? [], [treeMap])
  const previewImageSrc = useMemo(() => {
    if (!fileContent || fileContent.fileType !== 'image' || !fileContent.mimeType) {
      return null
    }
    return `data:${fileContent.mimeType};base64,${fileContent.content}`
  }, [fileContent])

  const loadTree = async (targetPath: string) => {
    setLoadingTreePath(targetPath)
    try {
      const res = await fetch('/api/obsidian-vault/tree', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath === '.' ? '' : targetPath }),
      })
      const data = (await res.json()) as TreeResponse | { error: string }
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Failed to load tree')
      }
      setTreeMap((prev) => ({ ...prev, [data.path]: data.children }))
      setError(null)
    } catch (treeError) {
      setError(treeError instanceof Error ? treeError.message : '加载目录失败')
    } finally {
      setLoadingTreePath(null)
    }
  }

  const loadFile = async (targetPath: string) => {
    setLoadingFile(true)
    try {
      const res = await fetch('/api/obsidian-vault/file', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath }),
      })
      const data = (await res.json()) as FileResponse | ErrorResponse
      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Failed to load file')
      }
      setFileContent(data)
      setSelectedFilePath(targetPath)
      setError(null)
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : '读取文件失败')
    } finally {
      setLoadingFile(false)
    }
  }

  useEffect(() => {
    void loadTree('.')
  }, [])

  const toggleDirectory = async (dirPath: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(dirPath)) {
        next.delete(dirPath)
      } else {
        next.add(dirPath)
      }
      return next
    })

    if (!treeMap[dirPath]) {
      await loadTree(dirPath)
    }
  }

  const renderTree = (nodes: VaultNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path)
      const children = treeMap[node.path] ?? []
      const isActiveFile = selectedFilePath === node.path

      return (
        <div key={node.path}>
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted/60 ${
              isActiveFile ? 'bg-primary/10 text-primary' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => {
              if (node.isDirectory) {
                void toggleDirectory(node.path)
              } else {
                void loadFile(node.path)
              }
            }}
          >
            <span className="w-4 text-center">{node.isDirectory ? (isExpanded ? '▾' : '▸') : '•'}</span>
            <span className="truncate">{node.name}</span>
          </button>
          {node.isDirectory && isExpanded && children.length > 0 ? renderTree(children, depth + 1) : null}
        </div>
      )
    })
  }

  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Obsidian Vault 查看器</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          通过环境变量 <code>AGENT_LOCAL_CWD</code> 指定 Vault 目录，在前端浏览文件树并查看文档内容。
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[320px_1fr]">
        <section className="min-h-0 overflow-auto rounded-lg border border-border p-3">
          <div className="mb-2 text-sm font-medium">目录树</div>
          {loadingTreePath === '.' && rootChildren.length === 0 ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            renderTree(rootChildren)
          )}
        </section>
        <section className="min-h-0 overflow-auto rounded-lg border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{fileContent?.path ?? '文档预览'}</h2>
            {loadingFile ? (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                读取中...
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
          ) : null}
          {!fileContent ? (
            <p className="text-sm text-muted-foreground">请选择左侧文档进行查看。</p>
          ) : fileContent.fileType === 'markdown' ? (
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{fileContent.content}</ReactMarkdown>
            </article>
          ) : fileContent.fileType === 'image' ? (
            previewImageSrc ? (
              <img src={previewImageSrc} alt={fileContent.path} className="max-h-[70vh] max-w-full rounded border border-border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">图片加载失败。</p>
            )
          ) : (
            <pre className="overflow-auto rounded bg-muted/50 p-3 text-sm">{fileContent.content}</pre>
          )}
        </section>
      </div>
    </div>
  )
}
