export type WorkItemState = 'ready'|'active'|'paused'|'blocked'|'done'|'skipped'
export type WorkItem = { id:string; sourceType:'todo'|'plan_occurrence'; sourceId:string; title:string; description:string; scheduledDate:string; queueOrder:number; priority:'high'|'normal'|'low'; state:WorkItemState; plannedMinutes:number; createdAt:string; updatedAt:string }
export type ExecutionSession = { id:string; workItemId:string; startedAt:string; endedAt:string|null; endReason:'paused'|'switched'|'completed'|'interrupted'|null; note:string }
export type TodayExecution = { items:WorkItem[]; sessions:ExecutionSession[] }
export type ExecutionActivity = {
  sessionId: string
  workItemId: string
  todoId: string
  title: string
  startedAt: string
  endedAt: string | null
  endReason: ExecutionSession['endReason']
}
