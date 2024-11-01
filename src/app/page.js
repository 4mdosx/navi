import Image from 'next/image'
import Link from 'next/link'
import NaviIcon from '@/components/navi-icon'
import '../style/home.css'

function Header() {
  return (
    <header className="md:container mx-auto">
      <nav>
        <Link href="/">./index.html</Link>
        <Link href="/tools">Tools</Link>
        {/* <Link href="/blog">Blog</Link> */}
      </nav>
    </header>
  )
}

function Profile() {
  return (
    <div className="profile flex">
      <NaviIcon icon="mdi:code" />
      <h1>4mdosx@Mokuseif.studio - A Web Development/Designer</h1>
    </div>
  )
}

function XenonButton() {
  return <div className="xenon button">😈</div>
}

function HaloButton() {
  return (
    <div className="halo button">
      <div className="halo-inner">🦄</div>
    </div>
  )
}

function InlineShadowButton() {
  return <div className="inline-shadow button">😊</div>
}

export default function Home() {
  return (
    <div className="home-page">
      <Header />
      <main className="flex min-h-screen flex-col items-center justify-start p-24">
        <Profile />
        <section id="breakout" className="mt-12">
          <XenonButton />
          <HaloButton />
          <InlineShadowButton />
        </section>
      </main>
    </div>
  )
}
