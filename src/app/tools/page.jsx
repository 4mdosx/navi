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
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Utility Tools 🏠</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...apps].map(app => (
          <Link
            href={`/tools/${app}`}
            key={app}
            className="group relative"
          >
            <div className="relative overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-gray-200/80">
              <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-gray-100">
                <span className="text-gray-700 text-xl font-medium capitalize transition-colors duration-300 group-hover:text-blue-600">
                  {app}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
