import { ChevronRight } from 'lucide-react'
import { Command } from './hooks/useCommandMenu'

interface CommandMenuProps {
  show: boolean
  commands: Command[]
  selectedIndex: number
  onSelectCommand: (command: Command) => void
}

export default function CommandMenu({
  show,
  commands,
  selectedIndex,
  onSelectCommand
}: CommandMenuProps) {
  if (!show || commands.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
      {commands.map((command, index) => (
        <div
          key={command.name}
          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
            index === selectedIndex
              ? 'bg-blue-50 text-blue-700'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelectCommand(command)}
        >
          <div className="flex flex-col">
            <span className="font-medium text-sm">{command.name}</span>
            <span className="text-xs text-gray-500">{command.description}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      ))}
    </div>
  )
}
