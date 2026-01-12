'use server'
import 'server-only'
import { promises as fs } from 'fs'
import { join } from 'path'
import { nanoid } from 'nanoid'
import { getSetting } from '@/backstage/model/settings.model'
import type { Task } from '@/types/tasks'

/**
 * 解析 markdown 文件，提取任务信息
 */
function parseMarkdownFile(
  content: string,
  filename: string
): Task | null {
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
  const id =
    frontmatter.taskId || frontmatter.id || filename.replace(/\.md$/, '')

  // 提取标题（从frontmatter）
  const title = frontmatter.title || filename.replace(/\.md$/, '')

  // 提取创建时间
  const createdAt =
    frontmatter.createdAt ||
    frontmatter.start_time ||
    frontmatter.startTime ||
    new Date().toISOString()

  // 提取更新时间
  const updatedAt = frontmatter.updatedAt || createdAt

  // 提取状态


  // 提取 todo 项（从表格格式解析）
  const todo: Array<Record<string, any>> = []

  // 解析表格格式: | title | content | completed | comment |
  // 匹配表格的所有行
  const tableRowRegex = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
  const rows: string[] = []
  let rowMatch
  while ((rowMatch = tableRowRegex.exec(body)) !== null) {
    rows.push(rowMatch[0])
  }

  // 跳过表头行（第一行）和分隔线（第二行），解析数据行
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    const match = row.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/)
    if (match) {
      const title = match[1].trim()
      const content = match[2].trim()
      const completed = match[3].trim().toLowerCase()
      const comment = match[4].trim()

      // 跳过空行或分隔线
      if (title.match(/^[-:]+$/) || (!title && !content)) {
        continue
      }

      todo.push({
        title,
        content,
        completed: completed === 'true',
        comment
      })
    }
  }

  const progress = todo.length > 0
    ? Math.round((todo.filter((item) => item.completed).length / todo.length) * 100)
    : 0

  return {
    id,
    title,
    progress,
    createdAt,
    updatedAt,
    todo,
  }
}

/**
 * 读取目录下的所有 markdown 文件并解析
 * @returns 解析后的任务列表
 * @throws 如果任务路径未配置或不存在，或读取文件时出错
 */
export async function readTasksFromFiles(): Promise<Task[]> {
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

  // 读取目录下的所有文件
  const files = await fs.readdir(taskPath)
  const mdFiles = files.filter((file) => file.endsWith('.md'))
  // 解析每个 markdown 文件
  const tasks: Task[] = []
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
 * @returns 创建的文件路径
 * @throws 如果任务路径未配置或不存在，或创建文件时出错
 */
export async function createTaskFile(
  title: string,
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
    taskId: taskId, // 保留 taskId 以兼容解析逻辑
    id: taskId,
    title,
    createdAt: now,
    progress: 0,
  }

  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
    .join('\n')

  const content = `---
${frontmatterYaml}
---

| title | content | completed | comment |
| ----- | ------- | --------- | ------- |
`

  // 写入文件
  await fs.writeFile(filePath, content, 'utf-8')

  return filePath
}

/**
 * 更新任务的 todo 项的 completed 状态
 * @param taskId 任务 ID
 * @param todoIndex todo 项的索引（从 0 开始）
 * @param completed 是否完成
 * @returns 更新后的任务
 * @throws 如果任务路径未配置或不存在，或更新文件时出错
 */
export async function updateTodoCompleted(
  taskId: string,
  todoIndex: number,
  completed: boolean
): Promise<Task> {
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

  // 查找对应的文件
  const files = await fs.readdir(taskPath)
  const mdFiles = files.filter((file) => file.endsWith('.md'))

  let filePath: string | null = null
  let filename: string | null = null

  // 通过文件名或文件内容中的 taskId 查找文件
  for (const file of mdFiles) {
    const path = join(taskPath, file)
    const content = await fs.readFile(path, 'utf-8')
    const parsed = parseMarkdownFile(content, file)
    if (parsed && parsed.id === taskId) {
      filePath = path
      filename = file
      break
    }
  }

  if (!filePath || !filename) {
    throw new Error(`Task not found: ${taskId}`)
  }

  // 读取文件内容
  const content = await fs.readFile(filePath, 'utf-8')

  // 分离 frontmatter 和 body
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    throw new Error(`Invalid markdown file format: ${filename}`)
  }

  const frontmatterText = match[1]
  let body = match[2]

  // 解析 frontmatter
  const frontmatter: Record<string, any> = {}
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

  // 解析表格并更新指定行的 completed 字段
  const tableRowRegex = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm
  const rows: string[] = []
  let rowMatch
  while ((rowMatch = tableRowRegex.exec(body)) !== null) {
    rows.push(rowMatch[0])
  }

  // 更新指定索引的 todo 行（跳过表头和分隔线）
  const dataRowIndex = todoIndex + 2 // +2 因为前两行是表头和分隔线
  if (dataRowIndex < rows.length) {
    const row = rows[dataRowIndex]
    const rowMatch = row.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/)
    if (rowMatch) {
      const title = rowMatch[1].trim()
      const content = rowMatch[2].trim()
      const comment = rowMatch[4].trim()

      // 更新 completed 字段
      const newCompleted = completed ? 'true' : 'false'
      const newRow = `| ${title} | ${content} | ${newCompleted} | ${comment} |`
      rows[dataRowIndex] = newRow
    }
  } else {
    throw new Error(`Todo index out of range: ${todoIndex}`)
  }

  // 重新构建 body（保留表头和分隔线，更新数据行）
  const tableHeader = rows[0]
  const tableSeparator = rows[1]
  const dataRows = rows.slice(2)

  // 找到表格的开始位置（匹配表头）
  const tableStartRegex = /^\| title \| content \| completed \| comment \|/m
  const tableMatch = body.match(tableStartRegex)

  if (tableMatch) {
    const tableStartIndex = tableMatch.index!
    // 找到表格结束位置（下一个非表格行或文件结束）
    const afterTable = body.substring(tableStartIndex)
    const tableEndMatch = afterTable.match(/\n(?!\|)/)
    const tableEndIndex = tableEndMatch
      ? tableStartIndex + tableEndMatch.index!
      : body.length

    // 替换表格部分
    const beforeTable = body.substring(0, tableStartIndex)
    const afterTableContent = body.substring(tableEndIndex)
    body = beforeTable + `${tableHeader}\n${tableSeparator}\n${dataRows.join('\n')}` + (afterTableContent.startsWith('\n') ? '' : '\n') + afterTableContent
  } else {
    // 如果没有找到表格，直接替换整个 body（这种情况不应该发生）
    body = `${tableHeader}\n${tableSeparator}\n${dataRows.join('\n')}`
  }

  // 更新 frontmatter 中的 updatedAt
  frontmatter.updatedAt = new Date().toISOString()

  // 重新构建 frontmatter
  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
    .join('\n')

  // 重新构建完整内容
  const newContent = `---
${frontmatterYaml}
---

${body}`

  // 写回文件
  await fs.writeFile(filePath, newContent, 'utf-8')

  // 返回更新后的任务
  return parseMarkdownFile(newContent, filename)!
}
