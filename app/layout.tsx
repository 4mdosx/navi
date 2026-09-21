import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: '../public/fonts/Inter-Variable.ttf',
  display: 'swap',
})

export const metadata = {
  title: 'Navi',
  description: 'Personal todo workspace for agents and humans.',
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('navi-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
