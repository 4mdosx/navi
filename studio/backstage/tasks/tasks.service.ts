'use server'
import 'server-only'
import { promises as fs } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { getSetting } from '@/backstage/model/settings.model'

export interface ParsedTask {
  taskId: string
  title: string
  start_time: string
  todo: Array<Record<string, any>>
}

/**
 * 解析 markdown 文件，提取任务信息
 */
function parseMarkdownFile(
  content: string,
  filename: string
): ParsedTask | null {
  // 提取 frontmatter (YAML格式)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  let frontmatter: Record<string, any> = {}
  let body = content

  if (match) {
    const frontmatterText = match[1]
    body = match[2]

    // 简单解析 YAML frontmatter
    frontmatterText.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
        const value = line
          .substring(colonIndex + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
        frontmatter[key] = value
      }
    })
  }

  // 提取任务ID（从文件名或frontmatter）
  const taskId =
    frontmatter.taskId || frontmatter.id || filename.replace(/\.md$/, '')

  // 提取标题（从frontmatter或第一个H1）
  let title = frontmatter.title || ''
  if (!title) {
    const h1Match = body.match(/^#\s+(.+)$/m)
    title = h1Match ? h1Match[1].trim() : filename.replace(/\.md$/, '')
  }

  // 提取开始时间
  const start_time =
    frontmatter.start_time ||
    frontmatter.startTime ||
    frontmatter.createdAt ||
    ''

  // 提取 todo 项（支持多种格式）
  const todo: Array<Record<string, any>> = []

  // 格式1: - [ ] 或 - [x] 开头的列表项
  const todoRegex = /^[-*]\s+\[([ x])\]\s+(.+)$/gm
  let todoMatch
  while ((todoMatch = todoRegex.exec(body)) !== null) {
    todo.push({
      checked: todoMatch[1] === 'x',
      text: todoMatch[2].trim(),
    })
  }

  // 格式2: 如果没有找到，尝试查找所有列表项
  if (todo.length === 0) {
    const listRegex = /^[-*]\s+(.+)$/gm
    let listMatch
    while ((listMatch = listRegex.exec(body)) !== null) {
      const text = listMatch[1].trim()
      if (text && !text.startsWith('[')) {
        todo.push({
          checked: false,
          text,
        })
      }
    }
  }

  // 格式3: 如果 frontmatter 中有 todo 数组
  if (todo.length === 0 && frontmatter.todo) {
    const todoData =
      typeof frontmatter.todo === 'string'
        ? JSON.parse(frontmatter.todo)
        : frontmatter.todo
    if (Array.isArray(todoData)) {
      todo.push(...todoData)
    }
  }

  return {
    taskId,
    title,
    start_time,
    todo,
  }
}

/**
 * 读取目录下的所有 markdown 文件并解析
 * @returns 解析后的任务列表
 * @throws 如果任务路径未配置或不存在，或读取文件时出错
 */
export async function readTasksFromFiles(): Promise<ParsedTask[]> {
  // 获取任务路径
  const taskPath = await getSetting('task_path')
  console.log('taskPath', taskPath)
  if (!taskPath) {
    throw new Error('Task path not configured. Please set task_path first.')
  }

  // 检查路径是否存在
  try {
    await fs.access(taskPath)
  } catch {
    throw new Error(`Task path does not exist: ${taskPath}`)
  }

  // 读取目录下的所有文件
  const files = await fs.readdir(taskPath)
  const mdFiles = files.filter((file) => file.endsWith('.md'))
  // 解析每个 markdown 文件
  const tasks: ParsedTask[] = []
  console.log('mdFiles', mdFiles)
  for (const file of mdFiles) {
    try {
      const filePath = join(taskPath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const parsed = parseMarkdownFile(content, file)
      if (parsed) {
        tasks.push(parsed)
      }
    } catch (error) {
      console.error(`Error parsing file ${file}:`, error)
      // 继续处理其他文件
    }
  }

  return tasks
}

/**
 * 创建任务模板文件
 * @param title 任务标题
 * @param description 任务描述（可选）
 * @returns 创建的文件路径
 * @throws 如果任务路径未配置或不存在，或创建文件时出错
 */
export async function createTaskFile(
  title: string,
  description?: string
): Promise<string> {
  // 获取任务路径
  const taskPath = await getSetting('task_path')
  if (!taskPath) {
    throw new Error('Task path not configured. Please set task_path first.')
  }

  // 检查路径是否存在
  try {
    await fs.access(taskPath)
  } catch {
    throw new Error(`Task path does not exist: ${taskPath}`)
  }

  // 生成任务ID（使用 nanoid + 时间戳）
  const timestamp = Date.now()
  const nanoId = nanoid(8) // 生成8位随机ID
  const taskId = `task-${timestamp}-${nanoId}`

  // 生成文件名
  const filename = `${taskId}.md`
  const filePath = join(taskPath, filename)

  // 检查文件是否已存在
  try {
    await fs.access(filePath)
    throw new Error(`Task file already exists: ${filename}`)
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }

  // 创建任务内容模板
  const now = new Date().toISOString()
  const frontmatter = {
    taskId,
    title,
    createdAt: now,
    status: 'in_progress',
    description: description || '任务描述',
  }

  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
    .join('\n')

  const content = `---
${frontmatterYaml}
---

| title | content | completed |
| ----- | ------- | --------- |
`

  // 写入文件
  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}
