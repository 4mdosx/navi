import { create } from 'zustand'
import { Todo, TodoCommit } from '@/types/todo'

interface TodoDetailState {
  // 状态
  todo: Todo | null
  progressUpdates: TodoCommit[]
  message: string
  loading: boolean
  sending: boolean

  // 操作
  setTodo: (todo: Todo | null) => void
  setProgressUpdates: (updates: TodoCommit[] | ((prev: TodoCommit[]) => TodoCommit[])) => void
  addProgressUpdate: (update: TodoCommit) => void
  setMessage: (message: string) => void
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  reset: () => void
}

export const useTodoDetailStore = create<TodoDetailState>((set) => ({
  // 初始状态
  todo: null,
  progressUpdates: [],
  message: '',
  loading: true,
  sending: false,

  // 操作
  setTodo: (todo) => set({ todo }),
  setProgressUpdates: (updates) => set((state) => ({
    progressUpdates: typeof updates === 'function' ? updates(state.progressUpdates) : updates
  })),
  addProgressUpdate: (update) => set((state) => ({
    progressUpdates: [...state.progressUpdates, update]
  })),
  setMessage: (message) => set({ message }),
  setLoading: (loading) => set({ loading }),
  setSending: (sending) => set({ sending }),
  reset: () => set({
    todo: null,
    progressUpdates: [],
    message: '',
    loading: true,
    sending: false
  })
}))
