#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const gatewayUrl = process.env.TODO_GATEWAY_URL?.trim() || 'http://127.0.0.1:5500/api/todos/gateway'
const token = process.env.TODO_GATEWAY_TOKEN?.trim()

async function gateway(operation: string, args: Record<string, unknown>) {
  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ requestId: crypto.randomUUID(), operation, arguments: args }),
  })
  const result = await response.json() as { success: boolean; data?: unknown; error?: string }
  if (!response.ok || !result.success) throw new Error(result.error || `Todo gateway failed (${response.status})`)
  return result.data
}

const server = new McpServer(
  { name: 'navi-todo', version: '1.0.0' },
  {
    instructions:
      'Use these tools as the only source of truth for Navi tasks. Read a todo before updating it, pass its version on writes, store stable requirements in description, and save execution checkpoints in content. Prefer append mode for progress notes. Ask before cascade deletion.',
  }
)

function result(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

const status = z.enum(['active', 'pending', 'blocked', 'done', 'cancelled'])
const placement = z.enum(['backlog', 'week_plan'])
const kind = z.enum(['direction', 'outcome', 'action', 'habit'])

server.registerTool('todo_list', {
  description: 'List and search Navi todos.',
  inputSchema: {
    placement: placement.optional(), weekStart: z.string().optional(),
    parentId: z.string().nullable().optional(), status: status.optional(), kind: kind.optional(),
    reviewBefore: z.string().optional(), query: z.string().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async (args) => result(await gateway('todo.list', args)))

server.registerTool('todo_get', {
  description: 'Read one todo, including its current version and execution state.',
  inputSchema: { id: z.string().min(1) },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async (args) => result(await gateway('todo.get', args)))

server.registerTool('todo_create', {
  description: 'Create a root todo or subtask in the canonical Navi Todo domain.',
  inputSchema: {
    title: z.string().min(1), description: z.string().optional(), content: z.string().optional(),
    parentId: z.string().nullable().optional(), status: status.optional(),
    estimatedMinutes: z.number().int().positive().optional(), placement: placement.optional(),
    kind: kind.optional(), reviewAt: z.string().nullable().optional(),
    activationCondition: z.string().optional(),
    weekStart: z.string().nullable().optional(), dayIndex: z.number().int().min(0).max(6).nullable().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway(args.parentId ? 'todo.create_subtask' : 'todo.create', args)))

server.registerTool('todo_update', {
  description: 'Update todo definition or lifecycle state. Read first and pass version.',
  inputSchema: {
    id: z.string().min(1), version: z.number().int().positive(), title: z.string().min(1).optional(),
    description: z.string().optional(), status: status.optional(), estimatedMinutes: z.number().int().positive().optional(),
    placement: placement.optional(), weekStart: z.string().nullable().optional(),
    kind: kind.optional(), reviewAt: z.string().nullable().optional(),
    activationCondition: z.string().optional(),
    dayIndex: z.number().int().min(0).max(6).nullable().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway('todo.update', args)))

server.registerTool('todo_update_content', {
  description: 'Replace or append to the execution checkpoint stored in todo.content.',
  inputSchema: {
    id: z.string().min(1), version: z.number().int().positive(),
    mode: z.enum(['replace', 'append']).default('append'), content: z.string(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway('todo.update_content', args)))

server.registerTool('todo_move', {
  description: 'Move or reorder a todo without creating cycles.',
  inputSchema: {
    id: z.string().min(1), version: z.number().int().positive(),
    parentId: z.string().nullable(), sortOrder: z.number().int().min(0).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway('todo.move', args)))

server.registerTool('todo_delete', {
  description: 'Delete a todo. Cascade deletion must be explicitly requested.',
  inputSchema: { id: z.string().min(1), cascade: z.boolean().default(false), confirm: z.literal(true) },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
}, async (args) => result(await gateway('todo.delete', args)))

server.registerTool('long_term_plan_list', {
  description: 'List long-term recurring plans and materialize their occurrences for the reference week.',
  inputSchema: { referenceDate: z.string().optional() },
  annotations: { readOnlyHint: true, openWorldHint: false },
}, async (args) => result(await gateway('long_term_plan.list', args)))

server.registerTool('long_term_plan_create', {
  description: 'Create a long-term recurring plan. The plan is the rule; occurrences are generated execution nodes.',
  inputSchema: {
    sourceTodoId: z.string().nullable(), title: z.string().min(1), description: z.string(),
    status: z.enum(['active', 'paused', 'done']).default('active'),
    cadence: z.enum(['daily', 'weekly']), scheduleMode: z.enum(['fixed_days', 'weekly_quota']),
    intervalWeeks: z.number().int().positive().default(1), targetCount: z.number().int().positive(),
    stretchCount: z.number().int().positive().nullable(), preferredDays: z.array(z.number().int().min(0).max(6)),
    estimatedMinutes: z.number().int().positive(), startDate: z.string(), endDate: z.string().nullable(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway('long_term_plan.create', args)))

server.registerTool('long_term_plan_update_occurrence', {
  description: 'Update one generated long-term-plan occurrence.',
  inputSchema: { id: z.string(), status: z.enum(['pending', 'active', 'done', 'skipped', 'missed']), note: z.string().optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
}, async (args) => result(await gateway('long_term_plan.update_occurrence', args)))

async function main() {
  await server.connect(new StdioServerTransport())
}

main().catch((error) => {
  console.error('Todo MCP server failed:', error)
  process.exit(1)
})
