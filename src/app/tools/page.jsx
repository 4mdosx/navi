'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { readAppFolder } from '../actions/tools'

export default function MicroApp() {
  const [apps, setApps] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const categories = new Set()
  for (const app of apps) {
    app.meta && categories.add(app.meta.category)
  }
  useEffect(() => {
    readAppFolder().then((apps) => {
      setApps(apps)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">
        Utility Tools 🏠
      </h1>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              className={`${
                activeCategory === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {[...categories].map((category) => (
              <button
                key={category}
                className={`${
                  activeCategory === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveCategory(category)}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...apps]
          .filter(
            (app) =>
              activeCategory === 'all' || app.meta?.category === activeCategory
          )
          .map((app) => (
            <Link
              href={`/tools/${app.path}`}
              key={app.path}
              className="group relative"
            >
              <div className="relative overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-gray-200/80">
                <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-gray-100">
                  <span className="text-gray-700 text-xl font-medium capitalize transition-colors duration-300 group-hover:text-blue-600">
                    {app.meta ? app.meta.title : app.path}
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
