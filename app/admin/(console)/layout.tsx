import { AdminProvider } from '@/components/admin/provider'

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>
}
