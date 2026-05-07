'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AgentSessionMeta = { status: string }
type AgentConfigResponse = { presets: unknown[] }

export default function DashboardPage() {
  const [sessionCount, setSessionCount] = useState(0)
  const [runningCount, setRunningCount] = useState(0)
  const [presetCount, setPresetCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [sessionsRes, configRes] = await Promise.all([
          fetch('/api/agent/sessions?limit=200', { credentials: 'include' }),
          fetch('/api/agent/config', { credentials: 'include' }),
        ])
        if (cancelled) return
        if (sessionsRes.ok) {
          const sessions = (await sessionsRes.json()) as AgentSessionMeta[]
          setSessionCount(sessions.length)
          setRunningCount(sessions.filter((s) => s.status === 'running').length)
        }
        if (configRes.ok) {
          const config = (await configRes.json()) as AgentConfigResponse
          setPresetCount(Array.isArray(config.presets) ? config.presets.length : 0)
        }
      } catch {
        // ignore and keep page usable
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">统一入口与运行统计</p>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Agent 会话总数</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{sessionCount}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">运行中会话</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{runningCount}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">Agent 预设数量</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{presetCount}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/week-plan" className="rounded-lg border border-border p-4 hover:bg-muted/40">
          <h2 className="font-medium">周计划</h2>
          <p className="mt-1 text-sm text-muted-foreground">拖拽安排每周任务</p>
        </Link>
        <Link href="/box-editor" className="rounded-lg border border-border p-4 hover:bg-muted/40">
          <h2 className="font-medium">空间编辑器</h2>
          <p className="mt-1 text-sm text-muted-foreground">编辑容器与布局内容</p>
        </Link>
        <Link href="/agent/chat" className="rounded-lg border border-border p-4 hover:bg-muted/40">
          <h2 className="font-medium">Agent 对话</h2>
          <p className="mt-1 text-sm text-muted-foreground">发起任务并跟踪会话</p>
        </Link>
        <Link
          href="/agent/settings"
          className="rounded-lg border border-border p-4 hover:bg-muted/40"
        >
          <h2 className="font-medium">Agent 设置</h2>
          <p className="mt-1 text-sm text-muted-foreground">管理 presets 与默认配置</p>
        </Link>
        <Link href="/obsidian-vault" className="rounded-lg border border-border p-4 hover:bg-muted/40">
          <h2 className="font-medium">Obsidian Vault</h2>
          <p className="mt-1 text-sm text-muted-foreground">浏览目录树并预览 Markdown 文档</p>
        </Link>
      </div>
    </div>
  )
}
