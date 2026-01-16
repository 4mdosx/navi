export interface Repository {
  id: string
  name: string
  path: string
  branch?: string
  lastCommit?: string
  remoteUrl?: string
  createdAt?: string
  updatedAt?: string
}
