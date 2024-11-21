'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { updateKv, getKv } from '@/app/actions/kv'

const Input = ({ value, onChange }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) => {
  // const { trigger, isMutating } = useSWRMutation('/tools/cliboard/api', updateClipboard, /* options */)
  return <textarea value={value} onChange={e => onChange(e)} />
}

const Page = () => {
  const { data, error, isLoading } = useSWR('clipboard', getKv)
  const [input, setInput] = useState('')
  return (
    <div>
      <p>{JSON.stringify({ data, error, isLoading })}</p>
      <Input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={() => updateKv('clipboard', input)}>Update</button>
    </div>
  )
}

export default function Clipboard() {
  return (
      <Page />
  )
}
