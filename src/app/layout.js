import './globals.css'
export const metadata = {
  title: 'Navi',
  description: 'Start exploring the Open Web from here.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
