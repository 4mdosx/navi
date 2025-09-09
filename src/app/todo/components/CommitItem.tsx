import { TodoCommit } from '@/types/todo'
import { BookPlus, BookText, BookMarked } from 'lucide-react'

interface CommitItemProps {
  update: TodoCommit
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    return '刚刚'
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}小时前`
  } else if (diffInHours < 48) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

export default function CommitItem({ update }: CommitItemProps) {
  const getIcon = () => {
    switch (update.action) {
      case 'create':
        return <BookPlus />
      case 'update':
        return <BookText />
      default:
        return <BookMarked />
    }
  }

  const getIconBgColor = () => {
    switch (update.action) {
      case 'create':
        return 'bg-green-500 ring-4 ring-green-100'
      case 'update':
        return 'bg-blue-500 ring-4 ring-blue-100'
      default:
        return 'bg-red-500 ring-4 ring-red-100'
    }
  }

  return (
    <div className="relative flex items-start gap-4 mb-6 last:mb-0">
      {/* Timeline dot */}
      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-lg ${getIconBgColor()}`}>
        {getIcon()}
      </div>

      {/* Commit content */}
      <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              {formatTime(update.timestamp)}
            </span>
          </div>
          <p className="text-gray-900 leading-relaxed">{update.message}</p>
        </div>
      </div>
    </div>
  )
}
