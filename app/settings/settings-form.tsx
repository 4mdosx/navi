'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PinInput from '@/app/login/components/pin-input'
import { updateAccessPin } from '@/app/actions/auth'
import { PIN_LENGTH } from '@/backstage/service/auth.types'

export default function SettingsForm({ updatedAt }: { updatedAt: string | null }) {
  const router = useRouter()
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [loading, setLoading] = useState(false)
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
    <Card>
      <CardHeader>
        <CardTitle>访问 PIN</CardTitle>
        <CardDescription>
          {formattedUpdatedAt
            ? `用于快速解锁应用。上次更新于 ${formattedUpdatedAt}`
            : '用于快速解锁应用'}
        </CardDescription>
      </CardHeader>
      <CardContent key={formKey} className="space-y-6">
        <div className="space-y-2">
          <Label className="block text-center">当前 PIN</Label>
          <PinInput autoFocus onChange={setCurrentPin} />
        </div>
        <div className="space-y-2">
          <Label className="block text-center">新 PIN</Label>
          <PinInput autoFocus={false} onChange={setPin} />
        </div>
        <div className="space-y-2">
          <Label className="block text-center">确认新 PIN</Label>
          <PinInput autoFocus={false} onChange={setConfirmPin} />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <Button disabled={loading || !canSubmit} onClick={() => void onSubmit()}>
          {loading ? '保存中…' : '更新 PIN'}
        </Button>
        {firstError && <p className="text-center text-sm text-red-500">{firstError}</p>}
        {message && <p className="text-center text-sm text-emerald-600">{message}</p>}
      </CardFooter>
    </Card>
  )
}
