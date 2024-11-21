import fs from 'fs/promises'
import Link from 'next/link'

async function readAppFolder() {
  const folder = await fs.readdir('./src/app/tools')
  const apps = new Set()
  for (const path of folder) {
    if (path.includes('.')) continue
    const files = await fs.readdir(`./src/app/tools/${path}`)
    files.forEach(file => {
      if (file.includes('page.')) {
        apps.add(path)
      }
    })
  }
  return apps
}

export default async function MicroApp() {
  const apps = await readAppFolder()
  return <div>
    <ul>
      {
        [...apps].map(app => (
          <li key={app}>
            <Link href={`/tools/${app}`}>{app}</Link>
          </li>
        ))
      }
    </ul>
  </div>
}
