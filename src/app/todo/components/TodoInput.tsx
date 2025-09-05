'use client'

import { forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TodoInputProps {
  message: string
  onMessageChange: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  sending: boolean
}

export const TodoInput = forwardRef<HTMLInputElement, TodoInputProps>(
  ({ message, onMessageChange, onSendMessage, sending }, ref) => {
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={onSendMessage} className="flex gap-2">
          <Input
            ref={ref}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="输入待办事项..."
            className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sending}
            className="rounded-full px-6 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
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
)

TodoInput.displayName = 'TodoInput'
