'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Folder, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DirectoryItem {
  name: string
  path: string
  isDirectory: boolean
}

interface ColumnData {
  path: string
  items: DirectoryItem[]
  isLoading: boolean
  error: string | null
}

interface DirectorySelectorProps {
  initialPath?: string
  onPathSelect?: (path: string) => void
}

export function DirectorySelector({ initialPath = '', onPathSelect }: DirectorySelectorProps) {
  const [columns, setColumns] = useState<ColumnData[]>([])
  const [currentPath, setCurrentPath] = useState(initialPath)
  const isInitialMount = useRef(true)

  const fetchDirectoryContents = async (pathToFetch: string, columnIndex?: number) => {
    try {
      const response = await fetch('/api/directories/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: pathToFetch }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch directory' }))
        throw new Error(errorData.error || 'Failed to fetch directory')
      }

      const data = await response.json()
      // 只显示目录，不显示文件
      const directories = data.items.filter((item: DirectoryItem) => item.isDirectory)

      if (columnIndex !== undefined) {
        // 更新指定列的数据
        setColumns((prev) => {
          const newColumns = [...prev]
          if (newColumns[columnIndex]) {
            newColumns[columnIndex] = {
              path: data.path || pathToFetch,
              items: directories,
              isLoading: false,
              error: null,
            }
          }
          return newColumns
        })
      } else {
        // 添加新列
        setColumns((prev) => [
          ...prev,
          {
            path: data.path || pathToFetch,
            items: directories,
            isLoading: false,
            error: null,
          },
        ])
      }

      // 更新当前路径
      if (data.path) {
        setCurrentPath(data.path)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load directory'

      if (columnIndex !== undefined) {
        setColumns((prev) => {
          const newColumns = [...prev]
          if (newColumns[columnIndex]) {
            newColumns[columnIndex] = {
              ...newColumns[columnIndex],
              isLoading: false,
              error: errorMessage,
            }
          }
          return newColumns
        })
      } else {
        setColumns((prev) => [
          ...prev,
          {
            path: pathToFetch,
            items: [],
            isLoading: false,
            error: errorMessage,
          },
        ])
      }
    }
  }

  // 组件加载时，如果没有初始路径，自动获取根目录
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (!initialPath || initialPath.trim() === '') {
        // 空字符串表示根目录
        fetchDirectoryContents('')
      } else {
        // 如果有初始路径，使用初始路径
        fetchDirectoryContents(initialPath.trim())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在组件挂载时执行一次

  const handleItemClick = (item: DirectoryItem, columnIndex: number) => {
    if (item.isDirectory) {
      // 立即更新当前路径，使高亮立即显示
      setCurrentPath(item.path)
      // 移除当前列之后的所有列，同时添加一个加载中的新列，避免闪烁
      setColumns((prev) => [
        ...prev.slice(0, columnIndex + 1),
        {
          path: item.path,
          items: [],
          isLoading: true,
          error: null,
        },
      ])
      // 异步加载新列的数据
      fetchDirectoryContents(item.path, columnIndex + 1)
    }
  }

  const handleSelectCurrentPath = () => {
    if (currentPath && onPathSelect) {
      onPathSelect(currentPath)
    }
  }

  // 检查是否有任何列正在加载
  const isLoading = columns.some((column) => column.isLoading)

  return (
    <div className="space-y-4">
      {columns.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <div className="flex overflow-x-auto max-h-[400px]" style={{ scrollbarWidth: 'thin' }}>
            {columns.map((column, columnIndex) => (
              <div
                key={`${columnIndex}-${column.path || 'loading'}`}
                className="flex-shrink-0 border-r last:border-r-0 min-w-[250px] max-w-[250px] flex flex-col"
              >
                {/* 列内容 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {column.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : column.error ? (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm">
                      {column.error}
                    </div>
                  ) : column.items.length > 0 ? (
                    <div className="divide-y">
                      {column.items.map((item) => {
                        const isSelected = item.path === currentPath
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleItemClick(item, columnIndex)}
                            className={cn(
                              'w-full flex items-center gap-2 px-4 py-3 text-left transition-colors',
                              item.isDirectory && 'cursor-pointer',
                              isSelected
                                ? 'bg-primary/10 hover:bg-primary/15 border-l-2 border-primary'
                                : 'hover:bg-muted'
                            )}
                          >
                            <Folder
                              className={cn(
                                'h-4 w-4 flex-shrink-0',
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <span
                              className={cn(
                                'flex-1 font-medium truncate',
                                isSelected && 'text-primary font-semibold'
                              )}
                            >
                              {item.name}
                            </span>
                            {item.isDirectory && (
                              <ChevronRight
                                className={cn(
                                  'h-4 w-4 flex-shrink-0',
                                  isSelected ? 'text-primary' : 'text-muted-foreground'
                                )}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground text-sm px-4">
                      该目录下没有子目录
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {columns.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {currentPath && (
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-muted-foreground">
            {currentPath}
          </span>
          <Button onClick={handleSelectCurrentPath} disabled={isLoading}>
            选择此目录
          </Button>
        </div>
      )}
    </div>
  )
}
