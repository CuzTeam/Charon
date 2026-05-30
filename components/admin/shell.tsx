import { AdminSidebar } from '@/components/admin/sidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
