export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface FormState {
  errors?: {
    [key: string]: string[]
  }
  message?: string
}
