'use server'
import 'server-only'
import { getDatabase } from '../db/database'
import { execSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { nanoid } from 'nanoid'
import path from 'path'
import type { Repository } from '../../types/repositories'

/**
 * 校验目录是否存在
 */
function validateDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`)
  }

  const stat = statSync(dirPath)
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${dirPath}`)
  }
}

/**
 * 校验目录是否为 Git 仓库
 * 使用 git rev-parse --show-toplevel 来获取 Git 仓库根目录
 */
function validateGitRepository(dirPath: string): string {
  try {
    // 使用 git rev-parse --show-toplevel 获取 Git 仓库根目录
    // 如果不是 Git 仓库，这个命令会失败
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: dirPath,
      encoding: 'utf-8',
    }).trim()

    // 返回规范化的绝对路径
    return path.resolve(gitRoot)
  } catch (error) {
    throw new Error(`Path is not a Git repository: ${dirPath}`)
  }
}

/**
 * 从路径中提取仓库名称
 */
function extractRepositoryName(repoPath: string): string {
  return path.basename(repoPath)
}

/**
 * 将日期转换为 ISO 字符串
 * 处理 Date 对象或字符串格式的日期
 */
function toISOString(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString()
  }
  // 如果已经是字符串，直接返回
  return date
}

/**
 * 获取所有仓库
 */
export async function getAllRepositories(): Promise<Repository[]> {
  const db = await getDatabase()
  const repositories = await db
    .selectFrom('repositories')
    .selectAll()
    .orderBy('createdAt', 'desc')
    .execute()

  return repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    path: repo.path,
    createdAt: toISOString(repo.createdAt),
  }))
}

/**
 * 根据 ID 获取仓库
 */
export async function getRepositoryById(id: string): Promise<Repository | null> {
  const db = await getDatabase()
  const result = await db
    .selectFrom('repositories')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!result) {
    return null
  }

  return {
    id: result.id,
    name: result.name,
    path: result.path,
    createdAt: toISOString(result.createdAt),
  }
}

/**
 * 添加仓库
 * 校验目录是否存在且为 Git 仓库
 */
export async function addRepository(repoPath: string): Promise<Repository> {
  // 校验目录是否存在
  validateDirectoryExists(repoPath)

  // 校验是否为 Git 仓库，并获取仓库根目录
  const gitRootPath = validateGitRepository(repoPath)

  // 检查仓库是否已存在
  const db = await getDatabase()
  const existing = await db
    .selectFrom('repositories')
    .select(['id'])
    .where('path', '=', gitRootPath)
    .executeTakeFirst()

  if (existing) {
    throw new Error(`Repository already exists: ${gitRootPath}`)
  }

  // 生成仓库信息
  const id = nanoid()
  const name = extractRepositoryName(gitRootPath)
  const now = new Date()
  // SQLite3 需要字符串格式的日期，而不是 Date 对象
  const createdAtString = now.toISOString()

  // 插入数据库
  await db
    .insertInto('repositories')
    .values({
      id,
      name,
      path: gitRootPath,
      createdAt: createdAtString as any, // SQLite 存储为 TEXT，Kysely 会处理转换
    })
    .execute()

  return {
    id,
    name,
    path: gitRootPath,
    createdAt: now.toISOString(),
  }
}

/**
 * 删除仓库
 */
export async function deleteRepository(id: string): Promise<void> {
  const db = await getDatabase()
  const result = await db
    .deleteFrom('repositories')
    .where('id', '=', id)
    .execute()

  if (result.length === 0) {
    throw new Error(`Repository not found: ${id}`)
  }
}
