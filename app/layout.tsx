import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TypeSoFast!',
  description: 'How fast can you type in Indonesian?',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
