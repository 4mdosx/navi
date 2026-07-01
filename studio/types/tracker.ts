export type TrackerKind = 'experiment' | 'inspiration' | 'long_task' | 'reminder'

export type TrackerStatus = 'active' | 'paused' | 'done'

export type TrackerCadence = 'weekly' | 'monthly' | null

export type TrackerItem = {
  id: string
  title: string
  kind: TrackerKind
  status: TrackerStatus
  cadence: TrackerCadence
  lastTouchedAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export const TRACKER_KIND_LABELS: Record<TrackerKind, string> = {
  experiment: '实验',
  inspiration: '灵感',
  long_task: '长期任务',
  reminder: '提醒',
}
