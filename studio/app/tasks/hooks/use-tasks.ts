'use client'

import { useCallback } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { Task } from '@/types/tasks'

// Fetcher 函数用于获取 tasks 数据
const fetcher = async (url: string) => {
  console.log('useTasks: Fetching tasks from', url)
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || 'Failed to fetch tasks')
  }
  return res.json()
}

/**
 * Hook to fetch tasks from markdown files
 */
export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>(
    '/api/tasks',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true, // 如果数据过期，自动重新验证
      dedupingInterval: 2000, // 2秒内的重复请求会被去重
    }
  )

  /**
   * 创建任务
   */
  const createTask = useCallback(async (title: string) => {
    if (!title || !title.trim()) {
      throw new Error('任务标题不能为空')
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title.trim() }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建任务失败')
    }

    // 使用 key 来 mutate，重新验证任务列表
    await globalMutate('/api/tasks', undefined, { revalidate: true })
  }, [])

  return {
    tasks: data,
    isLoading,
    isError: error,
    mutate,
    createTask,
  }
}
