'use client'

import type React from 'react'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import Progress from './progress'
import { cn } from '@/lib/utils'

interface VerificationCodeInputProps {
  length?: number
  onComplete: (code: string) => void
}

function getTimeLeft() {
  const now = new Date()
  const seconds = now.getSeconds()
  if (seconds > 30) {
    return 60 - seconds
  } else {
    return 30 - seconds
  }
}

export default function VerificationCodeInput({
  length = 6,
  onComplete,
}: VerificationCodeInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(''))
  const [activeInput, setActiveInput] = useState(0)
  const [timeLeft, setTimeLeft] = useState(getTimeLeft())
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setTimeLeft(getTimeLeft())
          return 0
        }
        return prevTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const value = e.target.value

    // Only accept numbers
    if (!/^\d*$/.test(value)) return

    // Update the code array
    const newCode = [...code]
    newCode[index] = value.substring(value.length - 1)
    setCode(newCode)

    // If input has a value, move to the next input
    if (value !== '') {
      if (index < length - 1) {
        setActiveInput(index + 1)
        inputRefs.current[index + 1]?.focus()
      } else {
        // If we're at the last input, check if the code is complete
        const completeCode = newCode.join('')
        if (completeCode.length === length) {
          onComplete(completeCode)
        }
      }
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

    if (pastedData.length >= length) {
      onComplete(pastedData.substring(0, length))
    }
  }

  useEffect(() => {
    inputRefs.current[activeInput]?.focus()
  }, [activeInput])

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-2">
        {code.map((digit, index) => (
          <Input
            key={index}
            ref={(ref) => {
              if (ref) {
                inputRefs.current[index] = ref
              }
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            className={cn(
              'h-14 w-12 text-center text-xl font-semibold',
              activeInput === index && 'border-primary'
            )}
            autoFocus={index === 0}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Code expires in</span>
          <span
            className={cn(
              'font-medium',
              timeLeft < 15 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            { timeLeft }
          </span>
        </div>
        <Progress value={(timeLeft / 30) * 100} className="h-1" />
      </div>
    </div>
  )
}
