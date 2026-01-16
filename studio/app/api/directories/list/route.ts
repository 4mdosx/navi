import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

interface DirectoryItem {
  name: string
  path: string
  isDirectory: boolean
}

/**
 * 检查路径是否在根目录范围内，防止路径遍历攻击
 */
function isPathWithinRoot(requestedPath: string, rootDir: string): boolean {
  try {
    // 规范化根目录路径
    const normalizedRoot = path.resolve(rootDir)

    // 规范化请求的路径（相对于根目录）
    const normalizedPath = path.resolve(normalizedRoot, requestedPath)

    // 检查规范化后的路径是否以根目录开头
    // 使用 path.relative 检查相对路径是否包含 '..'
    const relativePath = path.relative(normalizedRoot, normalizedPath)

    // 如果相对路径包含 '..' 或不是以根目录开头，则不安全
    // 同时确保规范化后的路径确实以根目录开头
    return (
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath) &&
      normalizedPath.startsWith(normalizedRoot)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // 从环境变量读取根目录
    const rootDir = process.env.rootDir

    if (!rootDir) {
      return NextResponse.json(
        { error: 'Root directory not configured' },
        { status: 500 }
      )
    }

    // 确保根目录存在
    const normalizedRoot = path.resolve(rootDir)
    if (!fs.existsSync(normalizedRoot)) {
      return NextResponse.json(
        { error: 'Root directory does not exist' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { path: dirPath } = body

    // 如果没有提供路径或路径为空，使用根目录
    let absolutePath: string
    if (!dirPath || typeof dirPath !== 'string' || dirPath.trim() === '') {
      absolutePath = normalizedRoot
    } else {
      // 安全检查：确保路径在根目录范围内
      if (!isPathWithinRoot(dirPath, normalizedRoot)) {
        return NextResponse.json(
          { error: 'Access denied: Path is outside root directory' },
          { status: 403 }
        )
      }
      // 构建绝对路径（相对于根目录）
      absolutePath = path.resolve(normalizedRoot, dirPath)
    }

    // 检查目录是否存在
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: 'Directory does not exist' },
        { status: 404 }
      )
    }

    // 检查是否是目录
    const stats = fs.statSync(absolutePath)
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      )
    }

    // 读取目录内容
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
    console.log('entries', entries)
    const items: DirectoryItem[] = entries
      .map((entry) => {
        const itemPath = path.join(absolutePath, entry.name)
        // 安全检查：确保每个子项的路径也在根目录内
        const itemAbsolutePath = path.resolve(itemPath)
        if (!itemAbsolutePath.startsWith(normalizedRoot)) {
          return null
        }
        return {
          name: entry.name,
          path: itemAbsolutePath,
          isDirectory: entry.isDirectory(),
        }
      })
      .filter((item): item is DirectoryItem => item !== null)

    // 按名称排序，目录优先
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      path: absolutePath,
      items,
    })
  } catch (error) {
    console.error('Error reading directory:', error)

    if (error instanceof Error) {
      // 处理权限错误
      if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    )
  }
}
