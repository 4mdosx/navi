import { create } from 'zustand'
import { Todo, TodoCommit } from '@/types/todo'

interface TodoDetailState {
  // 状态
  todo: Todo | null
  commits: TodoCommit[]
  message: string
  loading: boolean
  sending: boolean

  // 操作
  setTodo: (todo: Todo | null) => void
  setCommits: (commits: TodoCommit[] | ((prev: TodoCommit[]) => TodoCommit[])) => void
  addCommit: (commit: TodoCommit) => void
  handleUpdateCheckpointStatus: (checkpointId: string, status: CheckpointStatus, payload: Record<string, unknown>) => void
  setMessage: (message: string) => void
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  reset: () => void
}

export const useTodoDetailStore = create<TodoDetailState>((set) => ({
  // 初始状态
  todo: null,
  commits: [],
  message: '',
  loading: true,
  sending: false,

  // 操作
  setTodo: (todo) => set({ todo }),
  setCommits: (updates) => set((state) => ({
    commits: typeof updates === 'function' ? updates(state.commits) : updates
  })),
  addCommit: (update) => set((state) => ({
    commits: [...state.commits, update]
  })),
  handleUpdateCheckpointStatus: (checkpointId, status, payload) => set((state) => ({
    commits: state.commits.map((commit) =>
      commit.id === checkpointId ? { ...commit, status, payload } : commit
    )
  })),
  setMessage: (message) => set({ message }),
  setLoading: (loading) => set({ loading }),
  setSending: (sending) => set({ sending }),
  reset: () => set({
    todo: null,
    commits: [],
    message: '',
    loading: true,
    sending: false
  })
}))
