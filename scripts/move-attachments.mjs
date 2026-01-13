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
 * 移动附件文件到当前周目录
 */
function main() {
  const attachmentsDir = config.attachmentsDir
  const weeklyBaseDir = config.weeklyBaseDir

  // 检查源目录是否存在
  if (!fs.existsSync(attachmentsDir)) {
    console.error(`错误: 源目录不存在: ${attachmentsDir}`)
    process.exit(1)
  }

  // 获取当前日期所在的周
  const now = new Date()
  const { year, weekNumber } = getWeekNumber(now)
  const weekDirName = `${year}-${weekNumber}`
  const targetDir = path.join(weeklyBaseDir, weekDirName, 'attachments')

  console.log(`当前周: ${year} 年第 ${weekNumber} 周`)
  console.log(`目标目录: ${targetDir}`)

  // 读取源目录中的所有文件
  const files = fs.readdirSync(attachmentsDir)
  const fileStats = files
    .map((file) => {
      const filePath = path.join(attachmentsDir, file)
      const stat = fs.statSync(filePath)
      return { file, filePath, isFile: stat.isFile() }
    })
    .filter((item) => item.isFile)

  if (fileStats.length === 0) {
    console.log('没有找到需要移动的文件')
    return
  }

  console.log(`找到 ${fileStats.length} 个文件`)

  // 创建目标目录
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    console.log(`已创建目标目录: ${targetDir}`)
  }

  // 移动文件
  let movedCount = 0
  let skippedCount = 0

  for (const { file, filePath } of fileStats) {
    const targetPath = path.join(targetDir, file)

    // 如果目标文件已存在，跳过
    if (fs.existsSync(targetPath)) {
      console.log(`跳过: ${file} (目标文件已存在)`)
      skippedCount++
      continue
    }

    try {
      fs.renameSync(filePath, targetPath)
      console.log(`已移动: ${file}`)
      movedCount++
    } catch (error) {
      console.error(`移动失败: ${file} - ${error.message}`)
    }
  }

  console.log('\n完成！')
  console.log(`已移动: ${movedCount} 个文件`)
  if (skippedCount > 0) {
    console.log(`已跳过: ${skippedCount} 个文件`)
  }
}

main()
