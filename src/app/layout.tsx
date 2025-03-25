import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: '../../public/fonts/Inter-Variable.ttf',
  display: 'swap',
})

export const metadata = {
  title: 'Navi',
  description: 'Start exploring the Open Web from here.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
