import Image from 'next/image'
import Link from 'next/link'
import NaviIcon from '@/components/navi-icon'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <section className='recommendations'>
        <NaviIcon icon="mdi:home" />
        <Link href="/animated-tome">Animated Tome</Link>
      </section>
    </main>
  )
}
