import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAppAccess } from '@/backstage/service/auth.service'
import { getPinStatus } from '@/backstage/service/pin.service'
import SettingsForm from './settings-form'

export const metadata = {
  title: '设置 · Navi',
}

export default async function SettingsPage() {
  await requireAppAccess()
  const pin = await getPinStatus()

  return (
    <div className="min-h-svh bg-gradient-to-br from-background to-muted">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            返回
          </Link>
          <h1 className="text-lg font-semibold">设置</h1>
        </div>
        <SettingsForm updatedAt={pin.updatedAt} />
      </div>
    </div>
  )
}
