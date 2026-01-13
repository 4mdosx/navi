import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { config } from './config.js'

/**
 * 格式化日期为 yyyy-MM-dd HH-MM（文件名不能包含冒号）
 */
function formatDateForFilename(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}-${minutes}`
}

/**
 * 创建压缩包（使用系统 zip 命令）
 */
function createZip(sourceDir, outputPath, password) {
  const sourceDirName = path.basename(sourceDir)
  const parentDir = path.dirname(sourceDir)
  const outputFileName = path.basename(outputPath)
  const outputDir = path.dirname(outputPath)

  try {
    // 切换到父目录，然后压缩目录
    // 使用 -P 参数设置密码（注意：密码会出现在命令行中，但这是 zip 命令的标准方式）
    // 这样压缩包内的结构更清晰
    const command = `cd "${parentDir}" && zip -r -P "${password}" "${outputFileName}" "${sourceDirName}" -x "*.zip"`
    execSync(command, { stdio: 'inherit' })

    // 检查文件是否创建成功
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath)
      console.log(`压缩包已创建: ${outputPath}`)
      console.log(`总大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    } else {
      throw new Error('压缩包创建失败')
    }
  } catch (error) {
    throw new Error(`压缩失败: ${error.message}`)
  }
}

/**
 * 主函数
 */
function main() {
  const vaultDir = config.obsidianVaultDir

  // 检查源目录是否存在
  if (!fs.existsSync(vaultDir)) {
    console.error(`错误: 源目录不存在: ${vaultDir}`)
    process.exit(1)
  }

  // 生成文件名
  const now = new Date()
  const filename = `obsidian-backup-${formatDateForFilename(now)}.zip`
  // 将压缩包保存到源目录的父目录，避免压缩包被包含进去
  const parentDir = path.dirname(vaultDir)
  const outputPath = path.join(parentDir, filename)

  // 获取解压密码
  const password = config.unzipPassword || ''
  if (!password) {
    console.warn('警告: 未设置解压密码，压缩包将不加密')
  } else {
    console.log('已设置解压密码')
  }

  console.log(`正在打包目录: ${vaultDir}`)
  console.log(`输出文件: ${outputPath}`)

  try {
    createZip(vaultDir, outputPath, password)
    console.log('完成！')
  } catch (error) {
    console.error(`打包失败: ${error.message}`)
    process.exit(1)
  }
}

main()
