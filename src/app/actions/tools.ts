'use server'
import 'server-only'
import fs from 'fs/promises'

export const readAppFolder = async function () {
  console.log('reading app folder')
  const folder = await fs.readdir('./src/app/tools')
  const apps = new Set()
  for (const path of folder) {
    if (path.includes('.')) continue
    let meta = null
    let page = null
    const files = await fs.readdir(`./src/app/tools/${path}`)
    for (const file of files) {
      if (file.includes('page.')) {
        page = true
      } else if (file.includes('meta.json')) {
        meta = JSON.parse(await fs.readFile(`./src/app/tools/${path}/${file}`, 'utf8'))
      }
    }
    if (page) {
      apps.add({
        path,
        meta,
      })
    }
  }
  return apps
}
