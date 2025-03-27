'use client'
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

function checkInputType(input: string) {
  if (input.includes('\\u')) {
    return 'unicode'
  }
  if (input.startsWith('Ob')) {
    return 'number: binary'
  }
  if (input.startsWith('0x')) {
    return 'number: hex'
  }
  if (input.startsWith('0')) {
    return 'number: octal'
  }
  if (input.match(/^[0-9]+$/)) {
    return 'number: decimal'
  }

  if (input.startsWith('#') && (input.length === 7 || input.length === 4)) {
    return 'color:hex'
  }

  return 'string'
}

function guessTransformType(newInputType: string) {
  if (newInputType === 'unicode') {
    return 'string'
  }
  if (newInputType.startsWith('number:')) {
    return 'number'
  }
  if (newInputType.startsWith('color:')) {
    return 'color'
  }

  return 'unicode'
}

function numberBase (index: number) {
  switch (index) {
    case 0:
      return 'binary: '
    case 1:
      return 'octal: '
    case 2:
      return 'hex: '
    case 3:
      return 'decimal: '
    default:
      return 'decimal: '
  }
}

function transform(input: string, inputType: string, targetType: string) {
  if (inputType === 'string' && targetType === 'unicode') {
    return [input.split('').map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)]
  }
  if (inputType === 'unicode' && targetType === 'string') {
    return [input.split('\\u').map((code) => String.fromCharCode(parseInt(code, 16)))]
  }

  if (targetType === 'number') {
    let num = NaN
    if (inputType.endsWith(':binary')) {
      num = Number.parseInt(input.slice(2), 2)
    } else if (inputType.endsWith(':hex')) {
      num = Number.parseInt(input.slice(2), 16)
    } else if (inputType.endsWith(':octal')) {
      num = Number.parseInt(input.slice(2), 8)
    } else {
      num = Number.parseInt(input, 10)
    }
    return [num.toString(2), num.toString(8), num.toString(16), num.toString(10)] as string[]
  }

  // TODO: color transform
  return [input]
}

export default function Decode() {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState('string')
  const [targetType, setTargetType] = useState('string')
  const results = transform(input, inputType, targetType)

  function inputHandler(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.trim()
    setInput(value)
    const newInputType = checkInputType(value)
    setInputType(newInputType)
    setTargetType(guessTransformType(newInputType))
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Unicode code, Number Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input">Input</Label>
            <Input
              id="input"
              type="text"
              autoFocus
              autoComplete="off"
              value={input}
              onChange={inputHandler}
              placeholder="Input text to decode..."
            />
          </div>

          <div className="space-y-2">
            <Label>Result</Label>
            <div className="space-y-1">
              {results.map((result, index) => (
                <div key={index} className="p-2 bg-muted rounded-md min-h-10">
                  { targetType === 'number' ? numberBase(index) + result : result }
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-bold capitalize">{inputType}</span>
            <span className="mx-2">→</span>
            <span className="font-bold capitalize">{targetType}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
