'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PIN_LENGTH } from '@/backstage/service/auth.types'

interface PinInputProps {
  id?: string
  length?: number
  autoFocus?: boolean
  disabled?: boolean
  compact?: boolean
  className?: string
  onChange?: (code: string) => void
  onComplete?: (code: string) => void
}

export default function PinInput({
  id,
  length = PIN_LENGTH,
  autoFocus = true,
  disabled = false,
  compact = false,
  className,
  onChange,
  onComplete,
}: PinInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(''))
  const [activeInput, setActiveInput] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const emit = (nextCode: string[]) => {
    const value = nextCode.join('')
    onChange?.(value)
    if (value.length === length && nextCode.every(Boolean)) {
      onComplete?.(value)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.substring(value.length - 1)
    setCode(newCode)
    emit(newCode)

    if (value !== '' && index < length - 1) {
      setActiveInput(index + 1)
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      setActiveInput(index - 1)
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').trim()
    if (!/^\d+$/.test(pastedData)) return

    const newCode = [...code]
    for (let i = 0; i < Math.min(length, pastedData.length); i++) {
      newCode[i] = pastedData[i]
    }
    setCode(newCode)
    emit(newCode)

    const nextIndex = Math.min(pastedData.length, length - 1)
    setActiveInput(nextIndex)
    inputRefs.current[nextIndex]?.focus()
  }

  useEffect(() => {
    if (!autoFocus || disabled) return
    inputRefs.current[activeInput]?.focus()
  }, [activeInput, autoFocus, disabled])

  return (
    <div className={cn('flex justify-center space-x-2', compact && 'justify-start space-x-1.5', className)}>
      {code.map((digit, index) => (
        <Input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(ref) => {
            inputRefs.current[index] = ref
          }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`PIN 第 ${index + 1} 位`}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={index === 0 ? handlePaste : undefined}
          className={cn(
            'h-14 w-12 text-center text-xl font-semibold',
            compact && 'h-10 w-9 text-base font-medium',
            activeInput === index && 'border-primary'
          )}
          autoFocus={autoFocus && index === 0}
        />
      ))}
    </div>
  )
}
