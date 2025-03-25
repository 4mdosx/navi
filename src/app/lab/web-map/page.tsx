import Link from 'next/link'

export default function AnimatedTomeIndex() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <section className='recommendations'>
        <Link href="/animated-tome/page-1">Page 1</Link>
      </section>
    </main>
  )
}
