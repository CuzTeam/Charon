'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  AppWindow,
  ScrollText,
  Settings,
  Bot,
  Shield,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Clients', icon: AppWindow },
  { href: '/admin/audit_logs', label: 'Audit Logs', icon: ScrollText },
]

const settingsItems = [
  { href: '/admin/settings', label: 'General', icon: Settings },
  { href: '/admin/settings/onebots', label: 'OneBots', icon: Bot },
  { href: '/admin/settings/oauth', label: 'OAuth', icon: Shield },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
    window.location.reload()
  }

  function NavItem({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }) {
    const active = pathname === href || (href !== '/admin/settings' && pathname.startsWith(href + '/'))
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-sidebar sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          C
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Charon</p>
          <p className="text-xs text-muted-foreground">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <Separator className="my-2" />
        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settings
        </p>

        {settingsItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
