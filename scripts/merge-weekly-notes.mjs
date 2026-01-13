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
 * 将内容中的一级标题降级为二级标题
 */
function downgradeHeadings(content) {
  // 匹配行首的 # 标题（不包括 ## 等）
  return content.replace(/^#\s+(.+)$/gm, '## $1')
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
    const content = fs.readFileSync(filePath, 'utf-8')

    notes.push({
      date,
      filename: file,
      content: content.trim(),
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
 * 生成周报内容
 */
function generateWeeklyContent(weeklyNote) {
  const dates = weeklyNote.notes.map((note) => formatDate(note.date))
  const dateStr = dates.join('、')
  const updateAt = new Date().toISOString()

  const frontmatter = `---
date: ${dateStr}
updateAt: ${updateAt}
---`

  const sections = weeklyNote.notes.map((note) => {
    const dateHeader = `# ${formatDate(note.date)}`
    const content = downgradeHeadings(note.content)
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
    const weekDir = path.join(
      weeklyDir,
      `${weeklyNote.year}-${weeklyNote.weekNumber}`
    )
    if (!fs.existsSync(weekDir)) {
      fs.mkdirSync(weekDir, { recursive: true })
    }

    const outputPath = path.join(weekDir, 'content.md')
    const content = generateWeeklyContent(weeklyNote)

    fs.writeFileSync(outputPath, content, 'utf-8')
    console.log(
      `已生成: ${outputPath} (包含 ${weeklyNote.notes.length} 天的日记)`
    )
  }

  console.log('完成！')
}

main()
