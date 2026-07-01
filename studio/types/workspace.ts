/**
 * Workspace 类型预留 — 有具体项目需求时再实现 UI 与持久化。
 * Agent / Vault API 可作为 Workspace 内部依赖按需调用。
 */
export type Workspace = {
  id: string
  name: string
  /** 代码目录 */
  rootPath: string
  /** 引用 agent_presets.id */
  agentPresetId?: string
  /** dev server 或部署预览地址 */
  previewUrl?: string
  /** 关联 Obsidian 子目录 */
  notesPath?: string
}
