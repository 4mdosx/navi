import { NextRequest, NextResponse } from 'next/server'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

type VaultTreeNode = {
  name: string
  path: string
  isDirectory: boolean
}

function getVaultRoot() {
  const vaultRoot = process.env.AGENT_LOCAL_CWD
  if (!vaultRoot) {
    throw new Error('OBSIDIAN_VAULT_DIR is not configured')
  }
  return path.resolve(vaultRoot)
}

function resolveVaultPath(vaultRoot: string, relativePath: string) {
  const normalizedInput = relativePath.trim()
  const requestedPath = normalizedInput.length === 0 ? '.' : normalizedInput
  const absolutePath = path.resolve(vaultRoot, requestedPath)
  const relativeToRoot = path.relative(vaultRoot, absolutePath)
  const isOutside = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)

  if (isOutside) {
    throw new Error('Access denied: path is outside vault root')
  }

  return { absolutePath, relativeToRoot: relativeToRoot === '' ? '.' : relativeToRoot }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { path?: unknown }
    const requestedPath = typeof body.path === 'string' ? body.path : ''
    const vaultRoot = getVaultRoot()
    const { absolutePath, relativeToRoot } = resolveVaultPath(vaultRoot, requestedPath)

    const targetStat = await stat(absolutePath)
    if (!targetStat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 })
    }

    const entries = await readdir(absolutePath, { withFileTypes: true })
    const children: VaultTreeNode[] = entries
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const childRelativePath = path.join(relativeToRoot, entry.name)
        return {
          name: entry.name,
          path: childRelativePath === '.' ? entry.name : childRelativePath,
          isDirectory: entry.isDirectory(),
        }
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name, 'zh-Hans-CN-u-co-pinyin')
      })

    return NextResponse.json({
      root: vaultRoot,
      path: relativeToRoot,
      children,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list vault tree'
    const status =
      message.includes('not configured') ? 500 : message.includes('outside vault root') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
