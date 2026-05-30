import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Console — Charon',
  description: 'Charon Administration Console',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
