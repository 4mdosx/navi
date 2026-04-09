import fs from 'fs'
import path from 'path'
import { config } from './config.js'

/**
 * 获取日期所在年份的第几周
 * ISO 8601 标准：周一为一周的开始
 */
function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  )
  return { year: d.getUTCFullYear(), weekNumber }
}

/**
 * 解析 markdown frontmatter（仅支持简单 key/value 与数组）
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    return { attrs: {}, body: content }
  }

  const raw = match[1]
  const attrs = {}
  let currentArrayKey = null

  for (const line of raw.split('\n')) {
    const arrayItemMatch = line.match(/^\s*-\s+(.+)$/)
    if (arrayItemMatch && currentArrayKey) {
      if (!Array.isArray(attrs[currentArrayKey])) attrs[currentArrayKey] = []
      attrs[currentArrayKey].push(arrayItemMatch[1].trim())
      continue
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kvMatch) {
      currentArrayKey = null
      continue
    }

    const [, key, rawValue] = kvMatch
    const value = rawValue.trim()
    if (value === '') {
      attrs[key] = []
      currentArrayKey = key
      continue
    }

    currentArrayKey = null
    attrs[key] = value
  }

  const body = content.slice(match[0].length).trim()
  return { attrs, body }
}

/**
 * 读取所有日记文件
 */
function readDailyNotes(dailyDir) {
  const files = fs.readdirSync(dailyDir)
  const notes = []

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    // 解析文件名格式：2023-01-29.md
    const match = file.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/)
    if (!match) continue

    const [, year, month, day] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    if (isNaN(date.getTime())) continue

    const filePath = path.join(dailyDir, file)
    const rawContent = fs.readFileSync(filePath, 'utf-8')
    const { attrs, body } = parseFrontmatter(rawContent)

    notes.push({
      date,
      filename: file,
      content: body,
      frontmatter: attrs,
    })
  }

  // 按日期排序
  notes.sort((a, b) => a.date.getTime() - b.date.getTime())

  return notes
}

/**
 * 按周分组笔记
 */
function groupByWeek(notes) {
  const weeklyMap = new Map()

  for (const note of notes) {
    const { year, weekNumber } = getWeekNumber(note.date)
    const key = `${year}-${weekNumber}`

    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, {
        year,
        weekNumber,
        notes: [],
      })
    }

    weeklyMap.get(key).notes.push(note)
  }

  return Array.from(weeklyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.weekNumber - b.weekNumber
  })
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间为 YYYY.MM.DD HH:MM:SS
 */
function formatDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 将字符串规范化为 tag 形式
 */
function normalizeTag(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[,，]/g, '')
}

/**
 * 从正文中提取 hashtag（不含 #）
 */
function extractHashtags(content) {
  const tags = []
  const regex = /(^|\s)#([^\s#.,;:!?()[\]{}]+)/gmu
  for (const match of content.matchAll(regex)) {
    const tag = normalizeTag(match[2])
    if (tag) tags.push(tag)
  }
  return tags
}

/**
 * 将日报中的附件链接改为周报链接，并复制附件到周目录
 */
function rewriteAttachmentLinks(content, weekDir, weekDirName) {
  const weeklyRootDirName = path.basename(config.weeklyDir)
  const copiedFiles = new Set()
  let rewrittenCount = 0

  const rewrittenContent = content.replace(/!\[\[([^\]]+)\]\]/g, (fullMatch, inner) => {
    const [rawPathPart, aliasPart] = inner.split('|')
    if (!rawPathPart.startsWith(config.DAILY_ATTACHMENTS_PREFIX)) return fullMatch

    const [rawFilePart, hashPart] = rawPathPart.split('#')
    const relativeAttachmentPath = rawFilePart.slice(config.DAILY_ATTACHMENTS_PREFIX.length)
    if (!relativeAttachmentPath) return fullMatch

    const sourcePath = path.join(config.attachmentsDir, relativeAttachmentPath)
    const targetFilename = path.basename(relativeAttachmentPath)
    const targetPath = path.join(weekDir, targetFilename)

    if (!copiedFiles.has(targetPath)) {
      if (fs.existsSync(sourcePath)) {
        if (!fs.existsSync(targetPath)) {
          fs.copyFileSync(sourcePath, targetPath)
          console.log(`已复制附件: ${sourcePath} -> ${targetPath}`)
        }
        copiedFiles.add(targetPath)
      } else {
        console.warn(`附件不存在，跳过替换: ${sourcePath}`)
        return fullMatch
      }
    }

    const weeklyAttachmentPath = `${weeklyRootDirName}/${weekDirName}/${targetFilename}`
    const hashSuffix = hashPart ? `#${hashPart}` : ''
    const aliasSuffix = aliasPart ? `|${aliasPart}` : ''
    rewrittenCount++
    return `![[${weeklyAttachmentPath}${hashSuffix}${aliasSuffix}]]`
  })

  return { content: rewrittenContent, rewrittenCount, copiedCount: copiedFiles.size }
}

/**
 * 生成周报内容
 */
function generateWeeklyContent(weeklyNote, weekDir, weekDirName) {
  const dates = weeklyNote.notes.map((note) => formatDate(note.date))
  const updateAt = formatDateTime(new Date())
  const tags = new Set(['weekly', ...dates])
  const extraFrontmatter = new Map()

  const addExtraFrontmatterValue = (key, value) => {
    if (!extraFrontmatter.has(key)) {
      extraFrontmatter.set(key, new Set())
    }
    if (value && String(value).trim()) {
      extraFrontmatter.get(key).add(String(value).trim())
    }
  }

  for (const note of weeklyNote.notes) {
    const filenameTag = normalizeTag(note.filename.replace(/\.md$/i, ''))
    if (filenameTag) tags.add(filenameTag)

    for (const tag of extractHashtags(note.content)) tags.add(tag)

    for (const [key, value] of Object.entries(note.frontmatter || {})) {
      if (key === 'created' || key === 'updated') continue

      if (key === 'tags') {
        if (Array.isArray(value)) {
          for (const t of value) {
            const normalized = normalizeTag(t)
            if (normalized) tags.add(normalized)
          }
        } else {
          for (const t of String(value).split(/[,，\s]+/)) {
            const normalized = normalizeTag(t)
            if (normalized) tags.add(normalized)
          }
        }
        continue
      }

      if (Array.isArray(value)) {
        for (const item of value) addExtraFrontmatterValue(key, item)
      } else {
        addExtraFrontmatterValue(key, value)
      }
    }
  }

  const extraFrontmatterText = Array.from(extraFrontmatter.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => {
      const items = Array.from(values)
      if (items.length <= 1) {
        return `${key}: ${items[0] ?? ''}`
      }
      return `${key}:\n${items.map((item) => `  - ${item}`).join('\n')}`
    })
    .join('\n')

  const extraBlock = extraFrontmatterText ? `${extraFrontmatterText}\n` : ''
  const frontmatter = `---
updated: ${updateAt}
${extraBlock}tags:
${Array.from(tags)
  .map((tag) => `  - ${tag}`)
  .join('\n')}
---`

  const sections = weeklyNote.notes.map((note) => {
    const dateHeader = `# ${formatDate(note.date)}`
    const { content } = rewriteAttachmentLinks(
      note.content,
      weekDir,
      weekDirName
    )
    return `${dateHeader}\n\n${content}`
  })

  return `${frontmatter}\n\n${sections.join('\n\n---\n\n')}\n`
}

/**
 * 主函数
 */
function main() {
  const dailyDir = config.dailyDir
  const weeklyDir = config.weeklyDir

  // 检查源目录是否存在
  if (!fs.existsSync(dailyDir)) {
    console.error(`错误: 源目录不存在: ${dailyDir}`)
    process.exit(1)
  }

  // 读取所有日记文件
  console.log(`正在读取目录: ${dailyDir}`)
  const dailyNotes = readDailyNotes(dailyDir)
  console.log(`找到 ${dailyNotes.length} 个日记文件`)

  if (dailyNotes.length === 0) {
    console.log('没有找到日记文件，退出')
    return
  }

  // 按周分组
  const weeklyNotes = groupByWeek(dailyNotes)
  console.log(`共 ${weeklyNotes.length} 周`)

  // 创建目标目录
  for (const weeklyNote of weeklyNotes) {
    const weekDirName = `${weeklyNote.year}-${weeklyNote.weekNumber}`
    const weekDir = path.join(weeklyDir, weekDirName)
    if (!fs.existsSync(weekDir)) {
      fs.mkdirSync(weekDir, { recursive: true })
    }

    const outputPath = path.join(weekDir, 'content.md')
    const content = generateWeeklyContent(weeklyNote, weekDir, weekDirName)

    fs.writeFileSync(outputPath, content, 'utf-8')
    console.log(
      `已生成: ${outputPath} (包含 ${weeklyNote.notes.length} 天的日记)`
    )
  }

  console.log('完成！')
}

main()
