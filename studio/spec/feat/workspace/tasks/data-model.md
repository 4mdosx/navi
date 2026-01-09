# 数据模型规范

> **优先级**: 🔴 高（MVP 阶段第一步）
> **状态**: 📝 待实现

## 概述

本文档定义任务管理功能的数据模型和 Repository 接口。MVP 阶段使用内存数据实现，后续可迁移到数据库。

## 数据类型定义

### Task（任务）

```typescript
// modules/tasks/types.ts

export type TaskStatus = 'in_progress' | 'waiting' | 'completed' | 'paused'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress: number // 0-100
  filePath: string
  lastActiveAt: string // ISO 8601 格式
  createdAt: string // ISO 8601 格式
  updatedAt: string // ISO 8601 格式
}

export interface CreateTaskDto {
  title: string
  description?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  progress?: number
}
```

### TaskNote（任务临时记录）

```typescript
export type TaskNoteType = 'text' | 'image' | 'link' | 'code'

export interface TaskNote {
  id: string
  type: TaskNoteType
  content: string
  timestamp: string // ISO 8601 格式
  metadata?: Record<string, any>
}

export interface CreateTaskNoteDto {
  type: TaskNoteType
  content: string
  metadata?: Record<string, any>
}

export interface UpdateTaskNoteDto {
  type?: TaskNoteType
  content?: string
  metadata?: Record<string, any>
}
```

### TaskContext（任务上下文）

```typescript
export interface TaskContext {
  taskId: string
  lastNoteId?: string
  scrollPosition?: number
  openSections?: string[]
}
```

## Repository 接口

### TaskRepository

```typescript
// modules/tasks/repository.ts

import type { Task, CreateTaskDto, UpdateTaskDto } from './types'
import type { TaskNote, CreateTaskNoteDto, UpdateTaskNoteDto } from './types'

export interface TaskRepository {
  // 任务 CRUD
  findAll(): Promise<Task[]>
  findById(id: string): Promise<Task | null>
  create(data: CreateTaskDto): Promise<Task>
  update(id: string, data: UpdateTaskDto): Promise<Task>
  delete(id: string): Promise<void>

  // 任务记录 CRUD
  findNotesByTaskId(taskId: string): Promise<TaskNote[]>
  addNote(taskId: string, note: CreateTaskNoteDto): Promise<TaskNote>
  updateNote(taskId: string, noteId: string, note: UpdateTaskNoteDto): Promise<TaskNote>
  deleteNote(taskId: string, noteId: string): Promise<void>
}
```

## MVP 阶段实现（内存数据）

### InMemoryTaskRepository

```typescript
// modules/tasks/repository.ts

import { v4 as uuid } from 'uuid'
import type { TaskRepository } from './repository'
import type { Task, CreateTaskDto, UpdateTaskDto } from './types'
import type { TaskNote, CreateTaskNoteDto, UpdateTaskNoteDto } from './types'

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = []
  private notes: Map<string, TaskNote[]> = new Map() // taskId -> TaskNote[]

  async findAll(): Promise<Task[]> {
    return [...this.tasks]
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.find(task => task.id === id) || null
  }

  async create(data: CreateTaskDto): Promise<Task> {
    const now = new Date().toISOString()
    const task: Task = {
      id: uuid(),
      title: data.title,
      description: data.description,
      status: 'in_progress',
      progress: 0,
      filePath: `task-${uuid()}.md`,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    }
    this.tasks.push(task)
    this.notes.set(task.id, [])
    return task
  }

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    const task = this.tasks.find(t => t.id === id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    Object.assign(task, {
      ...data,
      updatedAt: new Date().toISOString(),
    })

    if (data.status || data.progress !== undefined) {
      task.lastActiveAt = new Date().toISOString()
    }

    return task
  }

  async delete(id: string): Promise<void> {
    const index = this.tasks.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`Task not found: ${id}`)
    }
    this.tasks.splice(index, 1)
    this.notes.delete(id)
  }

  async findNotesByTaskId(taskId: string): Promise<TaskNote[]> {
    return this.notes.get(taskId) || []
  }

  async addNote(taskId: string, note: CreateTaskNoteDto): Promise<TaskNote> {
    const task = await this.findById(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const taskNote: TaskNote = {
      id: uuid(),
      type: note.type,
      content: note.content,
      timestamp: new Date().toISOString(),
      metadata: note.metadata,
    }

    const notes = this.notes.get(taskId) || []
    notes.push(taskNote)
    this.notes.set(taskId, notes)

    // 更新任务的 lastActiveAt
    task.lastActiveAt = new Date().toISOString()
    task.updatedAt = new Date().toISOString()

    return taskNote
  }

  async updateNote(taskId: string, noteId: string, note: UpdateTaskNoteDto): Promise<TaskNote> {
    const notes = this.notes.get(taskId) || []
    const noteIndex = notes.findIndex(n => n.id === noteId)
    if (noteIndex === -1) {
      throw new Error(`Note not found: ${noteId}`)
    }

    Object.assign(notes[noteIndex], {
      ...note,
    })

    // 更新任务的 updatedAt
    const task = await this.findById(taskId)
    if (task) {
      task.updatedAt = new Date().toISOString()
    }

    return notes[noteIndex]
  }

  async deleteNote(taskId: string, noteId: string): Promise<void> {
    const notes = this.notes.get(taskId) || []
    const noteIndex = notes.findIndex(n => n.id === noteId)
    if (noteIndex === -1) {
      throw new Error(`Note not found: ${noteId}`)
    }
    notes.splice(noteIndex, 1)
    this.notes.set(taskId, notes)

    // 更新任务的 updatedAt
    const task = await this.findById(taskId)
    if (task) {
      task.updatedAt = new Date().toISOString()
    }
  }
}

// 导出单例实例
export const taskRepository = new InMemoryTaskRepository()
```

## Mock 数据（可选）

```typescript
// modules/tasks/mock-data.ts

import type { Task, TaskNote } from './types'

export const mockTasks: Task[] = [
  {
    id: '1',
    title: '示例任务 1',
    description: '这是一个示例任务',
    status: 'in_progress',
    progress: 30,
    filePath: 'task-1.md',
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '示例任务 2',
    description: '另一个示例任务',
    status: 'waiting',
    progress: 0,
    filePath: 'task-2.md',
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const mockNotes: Record<string, TaskNote[]> = {
  '1': [
    {
      id: 'note-1',
      type: 'text',
      content: '这是一条临时记录',
      timestamp: new Date().toISOString(),
    },
  ],
}
```

## 实现步骤

1. **创建类型定义文件**
   - [ ] 创建 `modules/tasks/types.ts`
   - [ ] 定义 `Task`, `TaskNote`, `TaskContext` 等类型
   - [ ] 定义 DTO 类型

2. **创建 Repository 接口**
   - [ ] 创建 `modules/tasks/repository.ts`
   - [ ] 定义 `TaskRepository` 接口

3. **实现内存 Repository**
   - [ ] 实现 `InMemoryTaskRepository` 类
   - [ ] 实现所有 CRUD 方法
   - [ ] 导出单例实例

4. **（可选）创建 Mock 数据**
   - [ ] 创建 `modules/tasks/mock-data.ts`
   - [ ] 定义示例数据

## 验收标准

- [ ] 所有类型定义完整且类型安全
- [ ] Repository 接口定义清晰
- [ ] InMemoryTaskRepository 实现所有方法
- [ ] 可以创建、查询、更新、删除任务
- [ ] 可以管理任务记录（增删改查）
- [ ] 类型检查通过，无 TypeScript 错误

## 注意事项

- MVP 阶段使用内存数据，数据在页面刷新后会丢失（这是预期的）
- 后续迁移到数据库时，只需替换 Repository 实现，接口保持不变
- 所有时间字段使用 ISO 8601 格式字符串
- UUID 使用 `uuid` 库生成


