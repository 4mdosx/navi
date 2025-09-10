import { useState } from 'react'
import { TodoCommit, CheckpointStatus } from '@/types/todo'
import { BookPlus, BookText, BookMarked, CheckCircle, Flag, ChevronDown, ChevronRight, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CommitItemProps {
  update: TodoCommit
  onUpdateCheckpointStatus?: (checkpointId: string, status: CheckpointStatus) => void
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

export default function CommitItem({ update, onUpdateCheckpointStatus }: CommitItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getIcon = () => {
    switch (update.type) {
      case 'create':
        return <BookPlus />
      case 'message':
        return <BookText />
      case 'done':
        return <CheckCircle />
      case 'checkpoint':
        return <Flag />
      default:
        return <BookMarked />
    }
  }

  const getIconBgColor = () => {
    switch (update.type) {
      case 'create':
        return 'bg-green-500 ring-4 ring-green-100'
      case 'message':
        return 'bg-blue-500 ring-4 ring-blue-100'
      case 'done':
        return 'bg-emerald-500 ring-4 ring-emerald-100'
      case 'checkpoint':
        return 'bg-purple-500 ring-4 ring-purple-100'
      default:
        return 'bg-gray-500 ring-4 ring-gray-100'
    }
  }

  const getStatusIcon = (status: CheckpointStatus) => {
    switch (status) {
      case 'open':
        return <Clock className="w-3 h-3" />
      case 'close':
        return <X className="w-3 h-3" />
      case 'done':
        return <CheckCircle className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: CheckpointStatus) => {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'close':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'done':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const hasSubCommits = update.subCommits && update.subCommits.length > 0
  const isCheckpoint = update.type === 'checkpoint'

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatTime(update.timestamp)}
              </span>
              {isCheckpoint && update.status && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(update.status)}`}>
                  {getStatusIcon(update.status)}
                  {update.status === 'open' ? '进行中' : update.status === 'close' ? '已关闭' : '已完成'}
                </span>
              )}
            </div>
            {hasSubCommits && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
          </div>
          <p className="text-gray-900 leading-relaxed">{update.message}</p>

          {/* Checkpoint actions */}
          {isCheckpoint && update.status === 'open' && onUpdateCheckpointStatus && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateCheckpointStatus(update.id, 'close')}
                className="text-gray-600"
              >
                关闭
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => onUpdateCheckpointStatus(update.id, 'done')}
                className="bg-green-500 hover:bg-green-600"
              >
                完成
              </Button>
            </div>
          )}
        </div>

        {/* Sub commits */}
        {hasSubCommits && isExpanded && (
          <div className="border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <div className="p-4 space-y-3">
              {update.subCommits!.map((subCommit) => (
                <div key={subCommit.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{subCommit.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(subCommit.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
