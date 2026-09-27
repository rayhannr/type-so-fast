import { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { pageMetadata } from '@/lib/metadata'

export const metadata: Metadata = {
  metadataBase: new URL('https://typesofast.rayhannr.dev'),
  ...pageMetadata(
    'TypeSoFast!',
    'Free typing speed test in English and Indonesian. Practice solo, race the computer, or go 1v1 with another player. See your WPM and personal bests.'
  )
}

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`

const faviconScript = `(function(){var link=document.querySelector('link[rel="icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}var frames=['/favicon-on.png','/favicon-off.png'];var i=0;setInterval(function(){i=(i+1)%frames.length;link.href=frames[i]},500)})()`

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: faviconScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
