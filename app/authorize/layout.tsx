import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authorize — Charon',
  description: 'Authorize an application to access your Charon account',
}

export default function AuthorizeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
