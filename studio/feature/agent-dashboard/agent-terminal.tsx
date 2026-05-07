'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { AgentPresetChoice } from '@/feature/agent-dashboard/types'
import type { ConversationTurn } from '@/feature/agent-dashboard/use-agent-session'
import { formatSdkMessageForTerminal } from '@/feature/agent-dashboard/sdk-message-format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function AgentChat(props: {
  turns: ConversationTurn[]
  disabled?: boolean
  sending?: boolean
  agentOptions?: AgentPresetChoice[]
  selectedAgent?: string
  onAgentChange?: (agentId: string) => void
  onSend: (text: string) => void | Promise<void>
}) {
  const { turns, disabled, sending, agentOptions, selectedAgent, onAgentChange, onSend } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')

  const rendered = useMemo(() => {
    return turns.map((t) => ({
      role: t.role,
      text: t.events.map((ev) => formatSdkMessageForTerminal(ev)).join('').trim(),
      done: t.done,
    }))
  }, [turns])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [rendered.length])

  return (
    <div className="flex h-full min-h-[12rem] w-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
      >
        {rendered.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无消息</div>
        ) : (
          rendered.map((t, i) => (
            <div
              key={i}
              className={cn(
                'flex w-full',
                t.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed sm:max-w-[80%]',
                  t.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                  t.done === false && t.role === 'agent' && 'ring-1 ring-amber-500/40'
                )}
              >
                {t.text.length > 0 ? t.text : (
                  <span className="text-muted-foreground">(empty)</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="shrink-0 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          const v = text.trim()
          if (!v) return
          void Promise.resolve(onSend(v)).then(() => setText(''))
        }}
      >
        <div className="flex items-end gap-2">
          <select
            value={selectedAgent ?? ''}
            onChange={(e) => onAgentChange?.(e.target.value)}
            disabled={disabled || sending || !agentOptions || agentOptions.length === 0}
            className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground"
            title="选择本轮消息使用的 Agent"
          >
            {(agentOptions ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={disabled ? '选择会话后开始对话…' : '输入消息，回车发送（Shift+Enter 换行）'}
            rows={2}
            disabled={disabled || sending}
            className="min-h-[2.5rem] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const v = text.trim()
                if (!v) return
                void Promise.resolve(onSend(v)).then(() => setText(''))
              }
            }}
          />
          <Button type="submit" disabled={disabled || sending || !text.trim()}>
            {sending ? '发送中' : '发送'}
          </Button>
        </div>
      </form>
    </div>
  )
}
