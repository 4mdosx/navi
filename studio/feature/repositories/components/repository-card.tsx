'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, GitBranch, Calendar, MapPin, Loader2 } from 'lucide-react'
import type { Repository } from '@/types/repositories'

interface RepositoryCardProps {
  repository: Repository
}

interface GitStatus {
  branch: string
  hasStagedChanges: boolean
  hasUnstagedChanges: boolean
  stagedDiff?: string
  unstagedDiff?: string
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  const handleViewDiff = async () => {
    if (showDiff && gitStatus) {
      // 如果已经显示，则隐藏
      setShowDiff(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/repositories/${repository.id}/diff`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取 Diff 失败')
      }
      const data: GitStatus = await response.json()
      setGitStatus(data)
      setShowDiff(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取 Diff 失败')
      setShowDiff(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{repository.name}</CardTitle>
          </div>
        </div>
        <CardDescription className="mt-2">
          {repository.path}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {repository.branch && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{repository.branch}</span>
          </div>
        )}

        {repository.lastCommit && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="truncate">{repository.lastCommit}</span>
          </div>
        )}

        {repository.remoteUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{repository.remoteUrl}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleViewDiff}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                加载中...
              </>
            ) : showDiff ? (
              '隐藏 Diff'
            ) : (
              '查看 Diff'
            )}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
            {error}
          </div>
        )}

        {showDiff && gitStatus && (
          <div className="space-y-3 pt-2 border-t">
            <div className="text-sm font-medium">Git 状态</div>
            <div className="text-sm text-muted-foreground">
              <div>分支: {gitStatus.branch}</div>
              <div className="mt-1">
                {gitStatus.hasStagedChanges && (
                  <span className="text-green-600 dark:text-green-400">有已暂存变更</span>
                )}
                {gitStatus.hasStagedChanges && gitStatus.hasUnstagedChanges && ' | '}
                {gitStatus.hasUnstagedChanges && (
                  <span className="text-yellow-600 dark:text-yellow-400">有未暂存变更</span>
                )}
                {!gitStatus.hasStagedChanges && !gitStatus.hasUnstagedChanges && (
                  <span className="text-muted-foreground">无变更</span>
                )}
              </div>
            </div>

            {gitStatus.stagedDiff && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  已暂存变更 (Staged)
                </div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
                  <code>{gitStatus.stagedDiff}</code>
                </pre>
              </div>
            )}

            {gitStatus.unstagedDiff && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  未暂存变更 (Unstaged)
                </div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
                  <code>{gitStatus.unstagedDiff}</code>
                </pre>
              </div>
            )}

            {!gitStatus.stagedDiff && !gitStatus.unstagedDiff && (
              <div className="text-sm text-muted-foreground">
                当前没有变更内容
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
