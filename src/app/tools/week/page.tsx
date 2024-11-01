import './week.css'
import { getWeek, getDayOfYear } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'this week is what week',
  description: 'this week is what week and day of the year',
}

export default function WeekApp(): React.ReactElement {
  const today = new Date()
  const week = getWeek(today)
  const day = getDayOfYear(today)
  const allWeeks = 52
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 week-app">
      <section className='card'>
        <h1>Today Is:
          <br />
          <span className='text-4xl font-bold my-2'>
            Week {week}
          </span>
          <br />
          Day {day}
        </h1>
        <div className='progress-bar mt-6'>
          {
            Array.from({ length: allWeeks }).map((_, index) => (
              <div key={index} className={`progress-bar-item ${index < week ? 'active' : ''}`}></div>
            ))
          }
        </div>
      </section>
    </main>
  )
}
