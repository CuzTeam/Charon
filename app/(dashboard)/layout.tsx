import type { Metadata } from 'next'
import { UserSidebar } from '@/components/user/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard — Charon',
  description: 'Your Charon user dashboard',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
