import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])
const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
}

function getVaultRoot() {
  const vaultRoot = process.env.AGENT_LOCAL_CWD
  if (!vaultRoot) {
    throw new Error('OBSIDIAN_VAULT_DIR is not configured')
  }
  return path.resolve(vaultRoot)
}

function resolveVaultFilePath(vaultRoot: string, relativePath: string) {
  const normalizedInput = relativePath.trim()
  if (!normalizedInput) {
    throw new Error('File path is required')
  }
  const absolutePath = path.resolve(vaultRoot, normalizedInput)
  const relativeToRoot = path.relative(vaultRoot, absolutePath)
  const isOutside = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)

  if (isOutside) {
    throw new Error('Access denied: path is outside vault root')
  }

  return { absolutePath, relativeToRoot }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { path?: unknown }
    const requestedPath = typeof body.path === 'string' ? body.path : ''
    const vaultRoot = getVaultRoot()
    const { absolutePath, relativeToRoot } = resolveVaultFilePath(vaultRoot, requestedPath)
    const fileStat = await stat(absolutePath)

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Path is not a file' }, { status: 400 })
    }

    const extension = path.extname(relativeToRoot).toLowerCase()
    const isMarkdown = MARKDOWN_EXTENSIONS.has(extension)
    const imageMimeType = IMAGE_MIME_BY_EXTENSION[extension]

    if (imageMimeType) {
      const buffer = await readFile(absolutePath)
      return NextResponse.json({
        path: relativeToRoot,
        fileType: 'image' as const,
        mimeType: imageMimeType,
        content: buffer.toString('base64'),
      })
    }

    const content = await readFile(absolutePath, 'utf-8')

    return NextResponse.json({
      path: relativeToRoot,
      fileType: isMarkdown ? ('markdown' as const) : ('text' as const),
      content,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read vault file'
    const status = message.includes('required')
      ? 400
      : message.includes('not configured')
        ? 500
        : message.includes('outside vault root')
          ? 403
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
