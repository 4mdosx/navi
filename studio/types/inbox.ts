export type InboxSource = 'manual' | 'bookmark' | 'obsidian' | 'other'

export type InboxItemStatus = 'inbox' | 'archived' | 'processed'

export type InboxItem = {
  id: string
  title: string
  url: string | null
  source: InboxSource
  status: InboxItemStatus
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}
