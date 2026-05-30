import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Charon — QQ OIDC Provider',
  description: 'Charon: A QQ-based OpenID Connect and OAuth 2.0 authentication provider',
  generator: 'Charon',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
