'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import useSWR from 'swr'

// Fetcher 函数用于获取 settings 数据
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || 'Failed to fetch settings')
  }
  return res.json()
}

export function SettingsView() {
  const [taskPath, setTaskPath] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // 获取当前设置
  const { data, error, isLoading, mutate } = useSWR<{ taskPath: string | null }>(
    '/api/settings/task-path',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  useEffect(() => {
    if (data?.taskPath !== undefined) {
      setTaskPath(data.taskPath || '')
    }
  }, [data])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const response = await fetch('/api/settings/task-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskPath }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '保存失败')
      }

      setSaveStatus('success')
      mutate() // 重新获取数据

      // 3秒后清除成功状态
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('Error saving task path:', error)
      setSaveStatus('error')
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>任务设置</CardTitle>
        <CardDescription>
          配置任务文件的存储路径。系统将读取该目录下的所有 markdown 文件作为任务。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">正在加载设置...</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md">
            <p className="text-sm font-medium">加载设置失败</p>
            <p className="text-xs mt-1">{error.message || '请刷新页面重试'}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="task-path">任务文件路径</Label>
          <Input
            id="task-path"
            type="text"
            placeholder="/path/to/your/tasks"
            value={taskPath}
            onChange={(e) => setTaskPath(e.target.value)}
            className="font-mono text-sm"
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            输入包含任务 markdown 文件的目录路径。例如：<code className="px-1 py-0.5 bg-muted rounded">./tasks</code> 或 <code className="px-1 py-0.5 bg-muted rounded">/Users/username/tasks</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
          {saveStatus === 'success' && (
            <span className="text-sm text-green-600">保存成功！</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-destructive">保存失败，请重试</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
