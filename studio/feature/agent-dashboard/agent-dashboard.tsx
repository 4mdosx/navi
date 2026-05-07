'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bot, ChevronDown, ChevronLeft, Loader2, RefreshCw, Square, Trash2 } from 'lucide-react'

import { AgentChat } from '@/feature/agent-dashboard/agent-terminal'
import { useAgentSession } from '@/feature/agent-dashboard/use-agent-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function AgentDashboard(props?: { mode?: 'chat' | 'settings' }) {
  const mode = props?.mode ?? 'chat'
  const [prompt, setPrompt] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [actionType, setActionType] = useState<'create' | 'reply'>('reply')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [presetForm, setPresetForm] = useState({
    id: '',
    label: '',
    runtime: 'local' as 'local' | 'cloud',
    promptPrefix:
      'You are working in a Navi-managed notes repository.\nGit branch policy: do all edits on branch `agent-dev` only.',
    localCwd: '/Users/token/Workshop/navi',
  })

  const {
    agents,
    selectedCreateAgent,
    selectedChatAgent,
    presets,
    sessions,
    selectedId,
    status,
    exitCode,
    turns,
    loadingList,
    creating,
    sending,
    aborting,
    error,
    refreshSessions,
    selectSession,
    setSelectedCreateAgent,
    setSelectedChatAgent,
    createSession,
    sendMessage,
    abortSession,
    createAgentPreset,
    updateAgentPreset,
    deleteAgentPreset,
    resetAgentPresetsToDefault,
  } = useAgentSession()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = prompt.trim()
    if (!p) return
    if (actionType === 'create') {
      await createSession(p, selectedCreateAgent || undefined)
    } else {
      if (!selectedId) return
      await sendMessage(p, selectedChatAgent || undefined)
    }
    setPrompt('')
  }

  const isRunning = status === 'running'
  const canSubmit =
    prompt.trim().length > 0 &&
    !creating &&
    !sending &&
    (actionType === 'create' || Boolean(selectedId))
  const primarySession = useMemo(() => {
    if (selectedId) return sessions.find((s) => s.id === selectedId) ?? sessions[0]
    return sessions[0]
  }, [selectedId, sessions])
  const visibleSessions = historyExpanded ? sessions : primarySession ? [primarySession] : []
  const isEditingPreset = Boolean(editingPresetId)

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate text-base font-semibold sm:text-lg">Agent</h1>
          </div>
        </div>
        <Link href="/dashboard" className="inline-flex">
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1">
            <ChevronLeft className="h-4 w-4" />
            返回
          </Button>
        </Link>
      </header>

      {error && (
        <div className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:px-4">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4">
        <aside className="flex w-full shrink-0 flex-col gap-3 sm:w-72 sm:max-w-[20rem]">
          {mode === 'chat' && (
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">会话历史</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2 text-xs"
                    onClick={() => setHistoryExpanded((v) => !v)}
                    disabled={sessions.length <= 1}
                  >
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', historyExpanded && 'rotate-180')}
                    />
                    {historyExpanded ? '收起' : '展开'}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  默认仅显示最近一条，展开可查看全部
                </CardDescription>
              </CardHeader>
              <CardContent className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pt-0">
                {sessions.length === 0 && !loadingList ? (
                  <p className="text-xs text-muted-foreground">暂无会话</p>
                ) : (
                  visibleSessions.map((s) => (
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
          )}

          {mode === 'settings' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agent 配置</CardTitle>
              <CardDescription className="text-xs">可新增/编辑/删除预设</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {presets.map((p) => (
                  <div key={p.id} className="rounded-md border border-border p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground">{p.runtime}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                      {p.id}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPresetId(p.id)
                          setPresetForm({
                            id: p.id,
                            label: p.label,
                            runtime: p.runtime,
                            promptPrefix: p.promptPrefix,
                            localCwd: p.local?.cwd ?? '',
                          })
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteAgentPreset(p.id)}
                        disabled={presets.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-md border border-border p-2">
                <Input
                  value={presetForm.id}
                  onChange={(e) => setPresetForm((s) => ({ ...s, id: e.target.value }))}
                  placeholder="id (如 navi-local)"
                  disabled={isEditingPreset}
                />
                <Input
                  value={presetForm.label}
                  onChange={(e) => setPresetForm((s) => ({ ...s, label: e.target.value }))}
                  placeholder="label"
                />
                <select
                  value={presetForm.runtime}
                  onChange={(e) =>
                    setPresetForm((s) => ({
                      ...s,
                      runtime: e.target.value === 'cloud' ? 'cloud' : 'local',
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="local">local</option>
                  <option value="cloud">cloud</option>
                </select>
                <Textarea
                  value={presetForm.promptPrefix}
                  onChange={(e) =>
                    setPresetForm((s) => ({ ...s, promptPrefix: e.target.value }))
                  }
                  rows={3}
                  placeholder="promptPrefix"
                />
                {presetForm.runtime === 'local' && (
                  <Input
                    value={presetForm.localCwd}
                    onChange={(e) =>
                      setPresetForm((s) => ({ ...s, localCwd: e.target.value }))
                    }
                    placeholder="local.cwd"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!editingPresetId) return
                      const ok = await updateAgentPreset(presetForm.id, {
                        label: presetForm.label,
                        runtime: presetForm.runtime,
                        promptPrefix: presetForm.promptPrefix,
                        local:
                          presetForm.runtime === 'local'
                            ? { cwd: presetForm.localCwd }
                            : undefined,
                      })
                      if (ok) {
                        setEditingPresetId(null)
                        setPresetForm((s) => ({ ...s, id: '' }))
                      }
                    }}
                    disabled={!isEditingPreset || !presetForm.id.trim()}
                  >
                    保存编辑
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (isEditingPreset) return
                      await createAgentPreset({
                        id: presetForm.id,
                        label: presetForm.label,
                        runtime: presetForm.runtime,
                        promptPrefix: presetForm.promptPrefix,
                        ...(presetForm.runtime === 'local'
                          ? { local: { cwd: presetForm.localCwd } }
                          : {}),
                      })
                    }}
                    disabled={
                      isEditingPreset || !presetForm.id.trim() || !presetForm.label.trim()
                    }
                  >
                    新增
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const ok = await resetAgentPresetsToDefault()
                      if (ok) {
                        setEditingPresetId(null)
                        setPresetForm({
                          id: '',
                          label: '',
                          runtime: 'local',
                          promptPrefix:
                            'You are working in a Navi-managed notes repository.\nGit branch policy: do all edits on branch `agent-dev` only.',
                          localCwd: '/Users/token/Workshop/navi',
                        })
                      }
                    }}
                  >
                    恢复默认
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </aside>

        {mode === 'chat' && (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <Card className="shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">操作区</CardTitle>
              <CardDescription className="text-xs">新建、刷新、回复统一入口</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={actionType}
                    onChange={(e) =>
                      setActionType(e.target.value === 'create' ? 'create' : 'reply')
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="reply">回复当前会话</option>
                    <option value="create">新建会话</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshSessions()}
                    disabled={loadingList}
                    className="gap-1"
                  >
                    <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
                    刷新列表
                  </Button>
                  <select
                    value={actionType === 'create' ? selectedCreateAgent : selectedChatAgent}
                    onChange={(e) => {
                      if (actionType === 'create') {
                        setSelectedCreateAgent(e.target.value)
                      } else {
                        setSelectedChatAgent(e.target.value)
                      }
                    }}
                    disabled={creating || sending || agents.length === 0}
                    className="h-9 min-w-52 rounded-md border border-input bg-background px-2 text-sm"
                    title="选择本次操作使用的 Agent"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.runtime})
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    actionType === 'create'
                      ? '输入发给 Cursor Agent 的任务，提交后新建会话…'
                      : selectedId
                        ? '输入回复内容…'
                        : '请先选择一个会话再回复…'
                  }
                  rows={3}
                  className="min-h-[4.5rem] resize-y text-sm"
                  disabled={creating || sending || (actionType === 'reply' && !selectedId)}
                />
                <div className="flex items-center justify-end">
                  <Button type="submit" disabled={!canSubmit} className="gap-1">
                    {(creating || sending) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {actionType === 'create' ? '创建会话' : '发送回复'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

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
                选择左侧会话或新建会话以查看输出
              </p>
            )}
          </div>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0 py-3">
              <CardTitle className="text-sm">对话</CardTitle>
              <CardDescription className="text-xs">
                Chat 视图；轮询拉取日志（标签页隐藏时降频）
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-2 pt-0 sm:p-3 sm:pt-0">
              <div className="h-full min-h-[12rem] w-full">
                <AgentChat
                  turns={turns}
                  disabled={!selectedId}
                  sending={sending}
                  agentOptions={agents}
                  selectedAgent={selectedChatAgent}
                  onAgentChange={setSelectedChatAgent}
                  hideComposer
                  onSend={async (text) => {
                    if (!selectedId) return
                    await sendMessage(text, selectedChatAgent || undefined)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </main>
        )}
      </div>
    </div>
  )
}
