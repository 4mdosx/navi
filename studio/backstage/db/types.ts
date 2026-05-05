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
}
