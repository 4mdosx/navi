'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Folder, GitBranch, Calendar, MapPin } from 'lucide-react'
import type { Repository } from '@/types/repositories'

interface RepositoryCardProps {
  repository: Repository
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
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
          <Button variant="outline" size="sm" className="flex-1">
            查看详情
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            管理
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
