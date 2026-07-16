import 'server-only'
import { z } from 'zod'
import { createLlmInteractionLog } from '@/backstage/llm/llm-interaction-log.service'
import { zhipuChatCompletion, type ZhipuMessage } from '@/backstage/llm/zhipu-client'
import { minutesToHours } from '@/backstage/week-plan/week-plan-hours'
import type { ParseTodoCopilotResult, TodoDraft } from '@/types/week-plan'

const TODO_COPILOT_FEATURE = 'week-plan-todo-copilot'

export class ParseTodoCopilotError extends Error {
  logId: string

  constructor(message: string, logId: string) {
    super(message)
    this.name = 'ParseTodoCopilotError'
    this.logId = logId
  }
}

const llmTaskSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  title: z.string().trim().min(1),
  estimatedMinutes: z.coerce.number().int().min(15).max(480),
})

const llmResponseSchema = z
  .object({
    tasks: z.array(llmTaskSchema).min(1).max(4),
    estimatedTotalMinutes: z.coerce.number().int().positive().optional(),
    wasSplit: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const roots = data.tasks.filter((t) => t.parentId === null)
    if (roots.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one root task (parentId null) is required',
      })
      return
    }
    const rootId = roots[0].id
    const children = data.tasks.filter((t) => t.parentId !== null)
    for (const child of children) {
      if (child.parentId !== rootId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Child task ${child.id} must reference root id ${rootId}`,
        })
      }
      if (child.estimatedMinutes > 30) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Subtask estimatedMinutes must be <= 30',
        })
      }
    }
    if (children.length > 0 && (children.length < 2 || children.length > 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Split tasks must have 2-3 subtasks',
      })
    }
  })

const SYSTEM_PROMPT = `你是任务规划助手。根据用户的自然语言描述，输出 JSON 任务结构。

规则：
1. 未提及时长时，根据任务规模、复杂度、交付物预估总耗时（分钟）。
2. 总时长 <= 60 分钟：输出 1 条根任务（parentId 为 null），不要子任务。
3. 总时长 > 60 分钟：输出 1 条根任务 + 2-3 条子任务。
   - 每条子任务 estimatedMinutes 必须 <= 30。
   - 子任务 parentId 必须等于根任务的 id。
   - 子任务标题具体、可独立执行（动词开头）。
   - 子任务时长之和应接近总预估（允许 ±15 分钟）。
4. 用户已给时长时，以用户时长为总时长基准；若 > 60 分钟则拆解。
5. 为每条任务生成唯一 id（如 p1, c1, c2）。
6. 只输出 JSON，不要 markdown 或其他文字。

输出格式：
{
  "tasks": [
    { "id": "p1", "parentId": null, "title": "...", "estimatedMinutes": 120 },
    { "id": "c1", "parentId": "p1", "title": "...", "estimatedMinutes": 30 }
  ],
  "estimatedTotalMinutes": 120,
  "wasSplit": true
}`

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) {
      return JSON.parse(fence[1].trim())
    }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Failed to parse JSON from model response')
  }
}

function toDraft(task: z.infer<typeof llmTaskSchema>, sortOrder: number): TodoDraft {
  return {
    id: task.id,
    parentId: task.parentId,
    title: task.title,
    estimatedHours: minutesToHours(task.estimatedMinutes),
    sortOrder,
  }
}

function buildResult(tasks: z.infer<typeof llmTaskSchema>[]): Omit<ParseTodoCopilotResult, 'logId'> {
  const root = tasks.find((t) => t.parentId === null)
  if (!root) {
    throw new Error('Missing root task')
  }

  const children = tasks
    .filter((t) => t.parentId === root.id)
    .map((t, i) => toDraft(t, i))

  if (children.length === 0) {
    return {
      parent: null,
      subtasks: [],
      root: toDraft(root, 0),
    }
  }

  const parentHours = children.reduce((sum, c) => sum + c.estimatedHours, 0)
  return {
    parent: {
      id: root.id,
      parentId: null,
      title: root.title,
      estimatedHours: parentHours,
      sortOrder: 0,
    },
    subtasks: children,
    root: null,
  }
}

export async function parseTodoCopilot(input: {
  text: string
  dayLabel?: string
}): Promise<ParseTodoCopilotResult> {
  const text = input.text.trim()
  if (!text) {
    throw new Error('text is required')
  }

  const userContent = [
    input.dayLabel ? `将添加到：${input.dayLabel}` : null,
    `用户描述：${text}`,
  ]
    .filter(Boolean)
    .join('\n')

  const messages: ZhipuMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]
  const chatOptions = { maxTokens: 512, temperature: 0.2 }

  let responseText: string | null = null
  let model = process.env.ZHIPU_MODEL?.trim() ?? 'glm-4-flash'

  try {
    const chat = await zhipuChatCompletion(messages, chatOptions)
    responseText = chat.content
    model = chat.model

    const parsed = llmResponseSchema.safeParse(extractJsonObject(responseText))
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? 'Invalid model output'
      const logId = await createLlmInteractionLog({
        feature: TODO_COPILOT_FEATURE,
        model,
        messages,
        requestMeta: chatOptions,
        responseText,
        error: message,
      })
      throw new ParseTodoCopilotError(message, logId)
    }

    const logId = await createLlmInteractionLog({
      feature: TODO_COPILOT_FEATURE,
      model,
      messages,
      requestMeta: chatOptions,
      responseText,
    })

    return { ...buildResult(parsed.data.tasks), logId }
  } catch (error) {
    if (error instanceof ParseTodoCopilotError) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Failed to parse todo'
    const logId = await createLlmInteractionLog({
      feature: TODO_COPILOT_FEATURE,
      model,
      messages,
      requestMeta: chatOptions,
      responseText,
      error: message,
    })
    throw new ParseTodoCopilotError(message, logId)
  }
}
