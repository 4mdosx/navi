import { useState } from 'react'
import { TodoCommit, CheckpointStatus } from '@/types/todo'
import { BookPlus, BookText, BookMarked, CheckCircle, Flag, ChevronDown, ChevronRight, X, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CommitItemProps {
  update: TodoCommit
  onUpdateCheckpointStatus?: (checkpointId: string, status: CheckpointStatus, payload: Record<string, unknown>) => void
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
      case 'pending':
        return <Pause className="w-3 h-3" />
      case 'open':
        return <Play className="w-3 h-3" />
      case 'close':
        return <X className="w-3 h-3" />
      case 'done':
        return <CheckCircle className="w-3 h-3" />
    }
  }

  const getStatusColor = (status: CheckpointStatus) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'open':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'close':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'done':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getStatusText = (status: CheckpointStatus) => {
    switch (status) {
      case 'pending':
        return '待开始'
      case 'open':
        return '进行中'
      case 'close':
        return '已关闭'
      case 'done':
        return '已完成'
    }
  }

  const handleStatusChange = (newStatus: CheckpointStatus) => {
    if (!onUpdateCheckpointStatus || !isCheckpoint) return

    const now = new Date().toISOString()
    const updatedPayload = { ...(update.payload || {}) }

    if (newStatus === 'open') {
      updatedPayload.startedAt = now
    } else if (newStatus === 'close' || newStatus === 'done') {
      updatedPayload.completedAt = now
    }

    onUpdateCheckpointStatus(update.id, newStatus, updatedPayload)
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
                  {getStatusText(update.status)}
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

          {/* Checkpoint status selector */}
          {isCheckpoint && onUpdateCheckpointStatus && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <Select
                value={update.status || 'pending'}
                onValueChange={(value) => handleStatusChange(value as CheckpointStatus)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="pending" className="hover:bg-yellow-50 focus:bg-yellow-50">
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4 text-yellow-600" />
                      <span>待开始</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="open" className="hover:bg-blue-50 focus:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-blue-600" />
                      <span>进行中</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="close" className="hover:bg-gray-50 focus:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-gray-600" />
                      <span>已关闭</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="done" className="hover:bg-green-50 focus:bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>已完成</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 显示时间信息 */}
              {update.payload?.startedAt && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  开始时间: {new Date(update.payload.startedAt).toLocaleString('zh-CN')}
                </p>
              )}
              {update.payload?.completedAt && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  完成时间: {new Date(update.payload.completedAt).toLocaleString('zh-CN')}
                </p>
              )}
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
