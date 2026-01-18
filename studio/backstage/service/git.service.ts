'use server'
import 'server-only'
import { execSync } from 'child_process'
import { getRepositoryById } from '../model/repository.model'

export interface GitStatus {
  branch: string
  hasStagedChanges: boolean
  hasUnstagedChanges: boolean
  stagedDiff?: string
  unstagedDiff?: string
}

/**
 * 获取 Git 仓库的当前分支
 */
function getCurrentBranch(repoPath: string): string {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim()
    return branch
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 检查是否有 staged 变更
 */
function hasStagedChanges(repoPath: string): boolean {
  try {
    const result = execSync('git diff --staged --quiet', {
      cwd: repoPath,
      encoding: 'utf-8',
    })
    return false
  } catch (error: any) {
    // git diff --quiet 在有变更时返回非零退出码
    return error.status === 1
  }
}

/**
 * 检查是否有 unstaged 变更
 */
function hasUnstagedChanges(repoPath: string): boolean {
  try {
    const result = execSync('git diff --quiet', {
      cwd: repoPath,
      encoding: 'utf-8',
    })
    return false
  } catch (error: any) {
    // git diff --quiet 在有变更时返回非零退出码
    return error.status === 1
  }
}

/**
 * 获取 staged diff
 */
function getStagedDiff(repoPath: string): string | undefined {
  try {
    const diff = execSync('git diff --staged', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim()
    return diff.length > 0 ? diff : undefined
  } catch (error) {
    // 如果没有 staged 变更，git diff --staged 可能返回空或错误
    return undefined
  }
}

/**
 * 获取 unstaged diff
 */
function getUnstagedDiff(repoPath: string): string | undefined {
  try {
    const diff = execSync('git diff', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim()
    return diff.length > 0 ? diff : undefined
  } catch (error) {
    // 如果没有 unstaged 变更，git diff 可能返回空或错误
    return undefined
  }
}

/**
 * 获取指定仓库的 Git 状态和 Diff 信息
 */
export async function getRepositoryGitStatus(repositoryId: string): Promise<GitStatus> {
  const repository = await getRepositoryById(repositoryId)

  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`)
  }

  const repoPath = repository.path

  try {
    const branch = getCurrentBranch(repoPath)
    const hasStaged = hasStagedChanges(repoPath)
    const hasUnstaged = hasUnstagedChanges(repoPath)
    const stagedDiff = hasStaged ? getStagedDiff(repoPath) : undefined
    const unstagedDiff = hasUnstaged ? getUnstagedDiff(repoPath) : undefined

    return {
      branch,
      hasStagedChanges: hasStaged,
      hasUnstagedChanges: hasUnstaged,
      stagedDiff,
      unstagedDiff,
    }
  } catch (error) {
    throw new Error(
      `Failed to get git status for repository ${repositoryId}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
