'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Search, Shield, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import SecuritySettings from './settings-form'

const TABS = [
  {
    id: 'general',
    label: '通用',
    description: '应用级偏好',
    icon: SlidersHorizontal,
    keywords: ['通用', '常用', '偏好', 'general'],
  },
  {
    id: 'security',
    label: '登录和安全',
    description: 'PIN 与会话',
    icon: Shield,
    keywords: ['登录', '安全', 'pin', '会话', '解锁', 'security'],
  },
] as const

type TabId = (typeof TABS)[number]['id']

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

export default function SettingsWorkspace({
  pinUpdatedAt,
}: {
  pinUpdatedAt: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabId>(isTabId(requestedTab) ? requestedTab : 'security')

  const visibleTabs = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return TABS
    return TABS.filter((tab) =>
      [tab.label, tab.description, ...tab.keywords].some((value) =>
        value.toLowerCase().includes(needle)
      )
    )
  }, [query])

  const selectTab = (id: TabId) => {
    setActiveTab(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b px-3 py-2 sm:px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          返回
        </Link>
        <h1 className="text-sm font-semibold">设置</h1>
        <div className="relative ml-auto min-w-0 max-w-xs flex-1 sm:flex-none sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索设置"
            className="h-8 pl-8 text-sm"
            aria-label="搜索设置"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="设置分类"
          className="w-44 shrink-0 border-r bg-muted/20 sm:w-56"
        >
          <ul className="flex flex-col gap-0.5 p-2">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon
              const selected = tab.id === activeTab
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border-l-2 px-2.5 py-1.5 text-left text-sm transition-colors',
                      selected
                        ? 'border-l-foreground bg-muted font-medium text-foreground'
                        : 'border-l-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                </li>
              )
            })}
            {visibleTabs.length === 0 && (
              <li className="px-2.5 py-2 text-xs text-muted-foreground">没有匹配的分类</li>
            )}
          </ul>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
            {activeTab === 'general' && (
              <GeneralPanel onOpenSecurity={() => selectTab('security')} />
            )}
            {activeTab === 'security' && (
              <>
                <PanelHeader title="登录和安全" description="管理解锁方式和当前会话。" />
                <SecuritySettings updatedAt={pinUpdatedAt} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function GeneralPanel({ onOpenSecurity }: { onOpenSecurity: () => void }) {
  return (
    <>
      <PanelHeader title="通用" description="应用级偏好。更多选项会逐步加到这里。" />
      <section className="max-w-2xl">
        <h3 className="text-sm font-semibold">常用</h3>
        <p className="mt-1 text-xs text-muted-foreground">从这里可以快速跳转到常用设置。</p>
        <button
          type="button"
          onClick={onOpenSecurity}
          className="mt-4 flex w-full items-start justify-between gap-4 rounded-md border px-3 py-3 text-left hover:bg-muted/50"
        >
          <span>
            <span className="block text-sm font-medium">访问 PIN</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              在「登录和安全」中更新快速解锁 PIN
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">打开</span>
        </button>
      </section>
    </>
  )
}
