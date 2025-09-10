import { TodoCommit, CheckpointStatus } from '@/types/todo'
import CommitItem from './CommitItem'

interface CommitListProps {
  progressUpdates: TodoCommit[]
  onUpdateCheckpointStatus?: (checkpointId: string, status: CheckpointStatus) => void
}

export default function CommitList({ progressUpdates, onUpdateCheckpointStatus }: CommitListProps) {
  if (progressUpdates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">还没有提交记录</p>
          <p className="text-sm text-gray-400">在下方输入框中记录你的进度</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {progressUpdates.map((update) => (
          <CommitItem
            key={update.id}
            update={update}
            onUpdateCheckpointStatus={onUpdateCheckpointStatus}
          />
        ))}
      </div>
    </div>
  )
}
