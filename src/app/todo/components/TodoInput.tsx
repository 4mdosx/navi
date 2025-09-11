import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTodoDetailStore } from '@/stores/todoDetailStore'
import { Send } from 'lucide-react'
import { useCommandMenu } from './hooks/useCommandMenu'
import CommandMenu from './CommandMenu'

interface TodoInputProps {
  onSubmit: (message: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function TodoInput({ onSubmit, placeholder, disabled = false }: TodoInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { message, setMessage, sending } = useTodoDetailStore()

  // 使用命令菜单Hook
  const {
    showCommandMenu,
    filteredCommands,
    selectedCommandIndex,
    handleInputChange,
    handleCommandKeyDown,
    selectCommand
  } = useCommandMenu({ setMessage })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending || disabled) return

    onSubmit(message.trim())
    setMessage('')
    inputRef.current?.focus()
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果命令菜单打开，先处理命令菜单的键盘事件
    if (showCommandMenu) {
      handleCommandKeyDown(e)
      return
    }
    console.log('handleKeyDown', e.key)

    // Ctrl+Enter 发送消息
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSubmit(e as React.FormEvent)
    }
    // 普通Enter键处理换行，阻止form提交
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()

      // 手动插入换行符
      const textarea = e.target as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      const newValue = value.substring(0, start) + '\n' + value.substring(end)
      setMessage(newValue)

      // 设置光标位置到换行符后
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
        adjustTextareaHeight()
      }, 0)
    }
  }

  // 自动调整Textarea高度
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  // 监听commit内容变化，自动调整高度
  React.useEffect(() => {
    adjustTextareaHeight()
  }, [message])

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="relative flex-1">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "分享进度... (Ctrl+Enter发送)"}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none overflow-hidden rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-4 py-2 leading-relaxed"
            disabled={sending || disabled}
            rows={1}
          />

          <CommandMenu
            show={showCommandMenu}
            commands={filteredCommands}
            selectedIndex={selectedCommandIndex}
            onSelectCommand={selectCommand}
          />
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || sending || disabled}
          className={`rounded-lg px-6 py-2 h-auto min-h-[40px] flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium`}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">发送</span>
            </>
          )}
        </Button>
      </form>
    </div>
  )
}