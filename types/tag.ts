export const INCLUDE_ALL = '*'

export type Tag = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type FocusMode = {
  id: string
  name: string
  includeTags: string[]
  excludeTags: string[]
  createdAt: string
  updatedAt: string
}

export type CreateFocusModeInput = {
  name: string
  includeTags?: string[]
  excludeTags?: string[]
}

export type UpdateFocusModeInput = Partial<CreateFocusModeInput>

export function normalizeTagName(raw: string): string {
  const name = raw.trim().replace(/^#+/, '').replace(/\s+/g, '')
  if (!name) throw new Error('标签名称不能为空')
  if (name === INCLUDE_ALL) throw new Error('标签名称不可用')
  if (name.length > 32) throw new Error('标签名称过长')
  return name
}

export function tagIdsOf(todo?: { tags?: Tag[] } | null): string[] {
  return (todo?.tags ?? []).map((tag) => tag.id)
}

export function matchesFocusMode(
  tagIds: readonly string[],
  mode?: Pick<FocusMode, 'includeTags' | 'excludeTags'> | null,
): boolean {
  if (!mode) return true
  const set = new Set(tagIds)
  const includeAll = mode.includeTags.includes(INCLUDE_ALL)
  if (!includeAll && !mode.includeTags.some((id) => set.has(id))) return false
  if (mode.excludeTags.some((id) => set.has(id))) return false
  return true
}

export function formatHashtag(name: string): string {
  return `#${name.replace(/^#+/, '')}`
}
