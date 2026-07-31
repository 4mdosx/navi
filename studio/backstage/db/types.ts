// 数据库 schema 类型定义（Kysely）
export interface Database {
  settings: {
    key: string
    value: string
    updatedAt: Date
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
  todos: {
    id: string
    parentId: string | null
    sortOrder: number
    depth: number
    title: string
    description: string
    content: string
    status: string
    estimatedMinutes: number
    placement: string
    kind: string
    reviewAt: string | null
    activationCondition: string
    hour: number
    dayIndex: number | null
    weekStart: string | null
    version: number
    startedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
  }
  long_term_plans: {
    id: string; sourceTodoId: string | null; title: string; description: string; status: string
    cadence: string; scheduleMode: string; intervalWeeks: number; targetCount: number
    stretchCount: number | null; preferredDays: string; estimatedMinutes: number
    startDate: string; endDate: string | null; version: number; createdAt: string; updatedAt: string
  }
  plan_occurrences: {
    id: string; planId: string; scheduledDate: string; status: string; actualMinutes: number | null
    note: string; completedAt: string | null; createdAt: string; updatedAt: string
  }
  plan_check_ins: {
    id: string; planId: string; weekStart: string; checkedAt: string; note: string
  }
  work_items:{id:string;sourceType:string;sourceId:string;title:string;description:string;scheduledDate:string;queueOrder:number;priority:string;state:string;plannedMinutes:number;createdAt:string;updatedAt:string}
  execution_sessions:{id:string;workItemId:string;startedAt:string;endedAt:string|null;endReason:string|null;note:string}
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
