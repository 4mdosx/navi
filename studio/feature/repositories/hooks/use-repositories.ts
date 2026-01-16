import useSWR from 'swr'
import type { Repository } from '@/types/repositories'

const fetcher = async (url: string): Promise<Repository[]> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || 'Failed to fetch repositories')
  }
  return res.json()
}

/**
 * Hook to fetch repositories
 */
export function useRepositories() {
  const { data, error, isLoading, mutate } = useSWR<Repository[]>(
    '/api/repositories',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  )

  return {
    repositories: data,
    isLoading,
    isError: error,
    mutate,
  }
}
