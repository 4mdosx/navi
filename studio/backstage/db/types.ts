// 数据库 schema 类型定义（Kysely）
export interface Database {
  settings: {
    key: string
    value: string
    updatedAt: Date
  }
  projects: {
    id: string
    title: string
    progress: number
    goal: number
    createdAt: string
    updatedAt: string
  }
  project_todos: {
    projectId: string
    weekItemIndex: number
    id: string
    content: string
    comment: string
  }
  agent_sessions: {
    id: string
    status: string
    startedAt: string
    endedAt: string | null
    exitCode: number | null
    /** Cursor SDK `run.id`（`Agent.getRun` 等） */
    sdkRunId: string | null
    /** Cursor SDK agent 标识，与 run 成对出现 */
    sdkAgentId: string | null
    /** `local` | `cloud`，与 `Agent.create` 配置一致 */
    sdkRuntime: string | null
    taskParamsJson: string
    createdAt: string
    logBlob: string
  }
  agent_presets: {
    id: string
    label: string
    runtime: string
    promptPrefix: string
    localCwd: string | null
    createdAt: string
    updatedAt: string
  }
  week_plan_pending: {
    id: string
    title: string
    estimatedHours: number
    hour: number
    sortOrder: number
    createdAt: string
    updatedAt: string
  }
  week_plan_todos: {
    id: string
    parentId: string | null
    sortOrder: number
    title: string
    content: string
    status: string
    estimatedHours: number
    estimatedMinutes: number
    hour: number
    dayIndex: number
    weekStart: string
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
  }
  tracker_items: {
    id: string
    title: string
    kind: string
    status: string
    cadence: string | null
    lastTouchedAt: string | null
    notes: string
    createdAt: string
    updatedAt: string
  }
  inbox_items: {
    id: string
    title: string
    url: string | null
    source: string
    status: string
    tags: string
    notes: string
    createdAt: string
    updatedAt: string
  }
  llm_interaction_logs: {
    id: string
    feature: string
    model: string
    requestJson: string
    responseText: string | null
    error: string | null
    createdAt: string
  }
}
