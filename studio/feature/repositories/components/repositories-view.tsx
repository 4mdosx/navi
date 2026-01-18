'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRepositories } from '../hooks/use-repositories'
import { RepositoryCard } from './repository-card'
import { DirectorySelector } from './directory-selector'
import { FolderPlus } from 'lucide-react'

export function RepositoriesView() {
  const { repositories, isLoading, isError, mutate } = useRepositories()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handlePathSelect = async (selectedPath: string) => {
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: selectedPath }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to add repository' }))
        throw new Error(error.error || 'Failed to add repository')
      }

      setIsDialogOpen(false)
      // 刷新仓库列表
      mutate()
    } catch (error) {
      console.error('Error adding repository:', error)
      // TODO: 可以添加错误提示 UI
      alert(error instanceof Error ? error.message : '添加仓库失败，请稍后重试')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Git 仓库管理</h1>
          <p className="text-muted-foreground mt-2">
            管理你的本地 Git 仓库，查看状态和提交信息
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <FolderPlus className="h-4 w-4 mr-2" />
          添加仓库
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-auto min-w-[500px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>选择 Git 仓库目录</DialogTitle>
            <DialogDescription>
              浏览并选择要添加的 Git 仓库目录
            </DialogDescription>
          </DialogHeader>
          <DirectorySelector onPathSelect={handlePathSelect} />
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="py-16 text-center">
          <div className="text-muted-foreground">正在加载仓库列表...</div>
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-destructive">
              <p className="font-semibold">无法加载仓库列表</p>
              <p className="text-sm mt-1">
                {isError.message || '请稍后重试'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && repositories && repositories.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="py-16 text-center">
              <div className="text-muted-foreground mb-2">还没有添加任何仓库</div>
              <p className="text-sm text-muted-foreground/70">
                点击"添加仓库"按钮开始管理你的 Git 仓库
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && repositories && repositories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </div>
      )}
    </div>
  )
}
