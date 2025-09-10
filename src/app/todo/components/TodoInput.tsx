import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTodoDetailStore } from '@/stores/todoDetailStore'
import { Flag } from 'lucide-react'

interface TodoInputProps {
  onSubmit: (message: string) => void
  onCreateCheckpoint?: (title: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function TodoInput({ onSubmit, onCreateCheckpoint, placeholder, disabled = false }: TodoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { message, setMessage, sending, clearMessage } = useTodoDetailStore()
  const [isCheckpointMode, setIsCheckpointMode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || disabled) return

    if (isCheckpointMode && onCreateCheckpoint) {
      onCreateCheckpoint(message.trim())
    } else {
      onSubmit(message.trim())
    }
    clearMessage()
    inputRef.current?.focus()
  }

  const toggleCheckpointMode = () => {
    setIsCheckpointMode(!isCheckpointMode)
    clearMessage()
  }

  return (
    <div className="space-y-2">
      {/* Checkpoint mode toggle */}
      {onCreateCheckpoint && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isCheckpointMode ? "default" : "outline"}
            size="sm"
            onClick={toggleCheckpointMode}
            className={isCheckpointMode ? "bg-purple-500 hover:bg-purple-600" : ""}
          >
            <Flag className="w-4 h-4 mr-1" />
            {isCheckpointMode ? "检查点模式" : "创建检查点"}
          </Button>
          {isCheckpointMode && (
            <span className="text-sm text-gray-500">输入检查点标题</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isCheckpointMode ? "输入检查点标题..." : (placeholder || "分享你的进度...")}
          className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          disabled={sending || disabled}
        />
        <Button
          type="submit"
          disabled={!message.trim() || sending || disabled}
          className={`rounded-full px-6 ${isCheckpointMode ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50`}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </Button>
      </form>
    </div>
  )
}