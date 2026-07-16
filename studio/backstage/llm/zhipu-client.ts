import 'server-only'

const ZHIPU_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export type ZhipuMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ZhipuChatOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function zhipuChatCompletion(
  messages: ZhipuMessage[],
  options: ZhipuChatOptions = {}
): Promise<{ content: string; model: string }> {
  const apiKey = process.env.ZHIPU_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('ZHIPU_API_KEY is not configured')
  }

  const model = options.model ?? process.env.ZHIPU_MODEL?.trim() ?? 'glm-4-flash'
  const res = await fetch(ZHIPU_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 512,
      stream: false,
    }),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
  }

  if (!res.ok) {
    const msg = data.error?.message ?? `Zhipu API error (${res.status})`
    throw new Error(msg)
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Empty response from Zhipu API')
  }

  return { content, model }
}
