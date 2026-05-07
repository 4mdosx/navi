'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Bot, ChevronLeft, Loader2, RefreshCw, Square } from 'lucide-react'

import { AgentTerminal, type AgentTerminalHandle } from '@/feature/agent-dashboard/agent-terminal'
import { useAgentSession } from '@/feature/agent-dashboard/use-agent-session'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function AgentDashboard() {
  const terminalRef = useRef<AgentTerminalHandle>(null)
  const [prompt, setPrompt] = useState('')

  const {
    sessions,
    selectedId,
    status,
    exitCode,
    loadingList,
    creating,
    aborting,
    error,
    refreshSessions,
    selectSession,
    createSession,
    abortSession,
  } = useAgentSession(terminalRef)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = prompt.trim()
    if (!p) return
    await createSession(p)
    setPrompt('')
  }

  const isRunning = status === 'running'

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/dashboard" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">周历</span>
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate text-base font-semibold sm:text-lg">Agent</h1>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshSessions()}
          disabled={loadingList}
          className="shrink-0 gap-1"
        >
          <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
          <span className="hidden sm:inline">刷新列表</span>
        </Button>
      </header>

      {error && (
        <div className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:px-4">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
        <aside className="flex w-full shrink-0 flex-col gap-3 sm:w-72 sm:max-w-[20rem]">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">会话</CardTitle>
              <CardDescription className="text-xs">
                点击选中；新建在下方表单
              </CardDescription>
            </CardHeader>
            <CardContent className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pt-0">
              {sessions.length === 0 && !loadingList ? (
                <p className="text-xs text-muted-foreground">暂无会话</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSession(s.id)}
                    className={cn(
                      'rounded-md border px-2 py-2 text-left text-xs transition-colors',
                      selectedId === s.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/60'
                    )}
                  >
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {s.id}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'font-medium',
                          s.status === 'running' && 'text-amber-600 dark:text-amber-400',
                          s.status === 'finished' && 'text-emerald-600 dark:text-emerald-400',
                          s.status === 'failed' && 'text-destructive'
                        )}
                      >
                        {s.status}
                      </span>
                      {s.exitCode != null && (
                        <span className="tabular-nums text-muted-foreground">
                          exit {s.exitCode}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">新建任务</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入发给 Cursor Agent 的任务…"
                  rows={4}
                  className="min-h-[5rem] resize-y text-sm"
                  disabled={creating}
                />
                <Button type="submit" disabled={creating || !prompt.trim()}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      创建中
                    </>
                  ) : (
                    '创建会话'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {selectedId ? (
              <>
                <span className="text-xs text-muted-foreground">当前</span>
                <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {selectedId}
                </code>
                {status && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      status === 'running' &&
                        'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      status === 'finished' &&
                        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                      status === 'failed' && 'bg-destructive/15 text-destructive'
                    )}
                  >
                    {status}
                  </span>
                )}
                {exitCode != null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    exit {exitCode}
                  </span>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="ml-auto gap-1"
                  disabled={!isRunning || aborting}
                  onClick={() => void abortSession()}
                >
                  {aborting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  中止
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                选择左侧会话或新建任务以查看输出
              </p>
            )}
          </div>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0 py-3">
              <CardTitle className="text-sm">输出</CardTitle>
              <CardDescription className="text-xs">
                只读终端视图；轮询拉取日志（标签页隐藏时降频）
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-2 pt-0 sm:p-3 sm:pt-0">
              <div className="h-full min-h-[12rem] w-full">
                <AgentTerminal ref={terminalRef} />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
