import { useState, useEffect, useCallback, useMemo } from 'react'

export interface Command {
  name: string
  description: string
  action: () => void
}

interface UseCommandMenuProps {
  setMessage: (message: string) => void
}

export function useCommandMenu({ setMessage }: UseCommandMenuProps) {
  // 命令提示相关状态
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null)

  // 预定义命令列表
  const commands: Command[] = useMemo(() => [
    {
      name: '/done',
      description: '标记为完成',
      action: () => {
        setMessage('/done')
        setShowCommandMenu(false)
      }
    },
    {
      name: '/start',
      description: '开始任务，更新任务时间',
      action: () => {
        setMessage('/start')
        setShowCommandMenu(false)
      }
    },
    {
      name: '/pending',
      description: '标记任务为未完成',
      action: () => {
        setMessage('/pending')
        setShowCommandMenu(false)
      }
    },
    {
      name: '/close',
      description: '关闭任务，更新任务时间',
      action: () => {
        setMessage('/close')
        setShowCommandMenu(false)
      }
    },
    {
      name: '/undo',
      description: '撤销最近的 commit',
      action: () => {
        setMessage('/undo')
        setShowCommandMenu(false)
      }
    },
    {
      name: '/checkpoint',
      description: '创建检查点',
      action: () => {
        setMessage('/checkpoint ')
        setShowCommandMenu(false)
      }
    }
  ], [setMessage])

  // 命令匹配和过滤逻辑
  const filterCommands = useCallback((input: string) => {
    if (!input.startsWith('/')) {
      setShowCommandMenu(false)
      return
    }

    const query = input.toLowerCase()
    const filtered = commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query)
    ).sort((a, b) => {
      // 优先显示完全匹配的，然后是按字母顺序
      const aExact = a.name.toLowerCase() === query
      const bExact = b.name.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      return a.name.localeCompare(b.name)
    })

    setFilteredCommands(filtered)
    setSelectedCommandIndex(0)
    setShowCommandMenu(filtered.length > 0)
  }, [commands])

  // 输入延迟检测
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    // 清除之前的定时器
    if (inputTimeout) {
      clearTimeout(inputTimeout)
    }

    // 设置新的定时器，500ms后检查输入
    const timeout = setTimeout(() => {
      filterCommands(value)
    }, 500)

    setInputTimeout(timeout)
  }, [setMessage, inputTimeout, filterCommands])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout)
      }
    }
  }, [inputTimeout])

  // 键盘事件处理
  const handleCommandKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showCommandMenu) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedCommandIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedCommandIndex(prev =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedCommandIndex]) {
          filteredCommands[selectedCommandIndex].action()
        }
        break
      case 'Escape':
        setShowCommandMenu(false)
        break
    }
  }, [showCommandMenu, filteredCommands, selectedCommandIndex])

  // 选择命令
  const selectCommand = useCallback((command: Command) => {
    command.action()
  }, [])

  return {
    showCommandMenu,
    filteredCommands,
    selectedCommandIndex,
    handleInputChange,
    handleCommandKeyDown,
    selectCommand
  }
}
