'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PinInput from '@/app/login/components/pin-input'
import { logout, updateAccessPin } from '@/app/actions/auth'
import { PIN_LENGTH } from '@/backstage/service/auth.types'

export default function SecuritySettings({ updatedAt }: { updatedAt: string | null }) {
  const router = useRouter()
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})

  const firstError =
    errors.currentPin?.[0] || errors.pin?.[0] || errors.confirmPin?.[0]

  const canSubmit =
    currentPin.length === PIN_LENGTH &&
    pin.length === PIN_LENGTH &&
    confirmPin.length === PIN_LENGTH

  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const onSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setErrors({})
    setMessage(null)
    const result = await updateAccessPin({ currentPin, pin, confirmPin })
    if ('errors' in result && result.errors) {
      setErrors(result.errors)
    } else {
      setMessage('PIN 已更新')
      setCurrentPin('')
      setPin('')
      setConfirmPin('')
      setFormKey((value) => value + 1)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      <SettingsGroup
        title="访问 PIN"
        description={
          formattedUpdatedAt
            ? `用于快速解锁应用。上次更新于 ${formattedUpdatedAt}`
            : '用于快速解锁应用'
        }
      >
        <div key={formKey} className="space-y-4">
          <PinField label="当前 PIN">
            <PinInput compact autoFocus={false} onChange={setCurrentPin} />
          </PinField>
          <PinField label="新 PIN">
            <PinInput compact autoFocus={false} onChange={setPin} />
          </PinField>
          <PinField label="确认新 PIN">
            <PinInput compact autoFocus={false} onChange={setConfirmPin} />
          </PinField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={loading || !canSubmit} onClick={() => void onSubmit()}>
            {loading ? '保存中…' : '更新 PIN'}
          </Button>
          {firstError && <p className="text-sm text-red-500">{firstError}</p>}
          {message && <p className="text-sm text-emerald-600">{message}</p>}
        </div>
      </SettingsGroup>

      <SettingsGroup title="会话" description="登录当天有效，过了当天零点需要重新输入 PIN。退出后立即失效。">
        <Button
          size="sm"
          variant="outline"
          disabled={loggingOut}
          onClick={() => {
            setLoggingOut(true)
            void logout()
          }}
        >
          {loggingOut ? '退出中…' : '退出登录'}
        </Button>
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="max-w-2xl border-b border-border/70 pb-8 last:border-b-0 last:pb-0">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function PinField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
