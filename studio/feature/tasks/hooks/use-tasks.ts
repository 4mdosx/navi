'use client'

import { useCallback } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { Task } from '@/types/tasks'

export type CreateTaskParams = {
  title: string
  goal?: number
  initialWeeks?: Array<{ content: string }>
}

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
  const createTask = useCallback(async (params: CreateTaskParams | string) => {
    const payload =
      typeof params === 'string'
        ? { title: params.trim() }
        : {
            title: params.title.trim(),
            goal: params.goal,
            initialWeeks: params.initialWeeks,
          }
    if (!payload.title) {
      throw new Error('任务标题不能为空')
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建任务失败')
    }

    await globalMutate('/api/tasks', undefined, { revalidate: true })
  }, [])

  const updateTask = useCallback(
    async (taskId: string, values: { title?: string; goal?: number }) => {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...values }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '更新任务失败')
      }
      await globalMutate('/api/tasks', undefined, { revalidate: true })
    },
    []
  )

  const deleteTask = useCallback(async (taskId: string) => {
    const response = await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || '删除任务失败')
    }
    await globalMutate('/api/tasks', undefined, { revalidate: true })
  }, [])

  return {
    tasks: data,
    isLoading,
    isError: error,
    mutate,
    createTask,
    updateTask,
    deleteTask,
  }
}
