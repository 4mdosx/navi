import type { SDKMessage, ToolUseBlock } from '@cursor/sdk'

export function formatSdkMessageForTerminal(msg: SDKMessage | unknown): string {
  if (!msg || typeof msg !== 'object') return ''
  const m = msg as SDKMessage & { type?: unknown }

  // Backward compat: server may emit this for legacy plain-text logs.
  if ((m as unknown as { type: string }).type === 'legacy_text') {
    const t = m as unknown as { text?: unknown }
    return typeof t.text === 'string' ? `${t.text}\n` : ''
  }

  switch (m.type) {
    case 'assistant': {
      let out = ''
      for (const block of m.message.content) {
        if (block.type === 'text') out += block.text
        else out += `\n[tool ${(block as ToolUseBlock).name}]\n`
      }
      return out
    }
    case 'thinking':
      return m.text ? `\n[thinking] ${m.text}\n` : ''
    case 'tool_call':
      return `\n[tool_call ${m.name} ${m.status}]\n`
    case 'user':
      return m.message.content.map((b) => b.text).join('')
    case 'status':
      return `\n[status ${m.status}]${m.message ? ` ${m.message}` : ''}\n`
    case 'task':
      return m.text ? `\n[task] ${m.text}\n` : ''
    case 'system':
    case 'request':
      return ''
    default:
      return ''
  }
}

