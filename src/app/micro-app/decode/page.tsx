'use client'
import { useState } from 'react'

function checkInputType(input: string) {
  if (input.includes('\\u')) {
    return 'unicode'
  }
  if (input.startsWith('Ob')) {
    return 'number:binary'
  }
  if (input.startsWith('0x')) {
    return 'number:hex'
  }
  if (input.startsWith('0')) {
    return 'number:octal'
  }
  if (input.match(/^[0-9]+$/)) {
    return 'number:decimal'
  }

  if (input.startsWith('#') && (input.length === 7 || input.length === 4)) {
    return 'color:hex'
  }

  return 'string'
}

function guessTransformType(newInputType: string, lastInputType: string, lastTargetType: string) {
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
    setTargetType(guessTransformType(newInputType, inputType, targetType))
  }
  return (
    <div>
      <header>
        <input type="text" autoFocus autoComplete="off" value={input} onChange={inputHandler} />
      </header>
      <main>
        <div>
          {results.map((result, index) => (
            <div key={index}>{result}</div>
          ))}
        </div>
        <div>
          {inputType} -> {targetType}
        </div>
      </main>
    </div>
  )
}
