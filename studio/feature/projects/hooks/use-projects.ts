'use client'

import { useCallback } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { Project } from '@/types/projects'

const PROJECTS_KEY = '/api/projects'

export type CreateProjectParams = {
  title: string
  goal?: number
  initialWeeks?: Array<{ content: string }>
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || 'Failed to fetch projects')
  }
  return res.json()
}

/**
 * 拉取项目列表并封装增删改
 */
export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(PROJECTS_KEY, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  })

  const createProject = useCallback(async (params: CreateProjectParams | string) => {
    const payload =
      typeof params === 'string'
        ? { title: params.trim() }
        : {
            title: params.title.trim(),
            goal: params.goal,
            initialWeeks: params.initialWeeks,
          }
    if (!payload.title) {
      throw new Error('项目标题不能为空')
    }

    const response = await fetch(PROJECTS_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errBody = await response.json()
      throw new Error(errBody.error || '创建项目失败')
    }

    await globalMutate(PROJECTS_KEY, undefined, { revalidate: true })
  }, [])

  const updateProject = useCallback(
    async (projectId: string, values: { title?: string; goal?: number }) => {
      const response = await fetch(PROJECTS_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...values }),
      })
      if (!response.ok) {
        const errBody = await response.json()
        throw new Error(errBody.error || '更新项目失败')
      }
      await globalMutate(PROJECTS_KEY, undefined, { revalidate: true })
    },
    []
  )

  const deleteProject = useCallback(async (projectId: string) => {
    const response = await fetch(PROJECTS_KEY, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    if (!response.ok) {
      const errBody = await response.json()
      throw new Error(errBody.error || '删除项目失败')
    }
    await globalMutate(PROJECTS_KEY, undefined, { revalidate: true })
  }, [])

  return {
    projects: data,
    isLoading,
    isError: error,
    mutate,
    createProject,
    updateProject,
    deleteProject,
  }
}
