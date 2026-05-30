'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Home, Gamepad2, LayoutGrid, LogOut } from 'lucide-react'

interface UserSession {
  authenticated: boolean
  user?: {
    id: string
    qq_id: string
    nickname: string
    email: string
    avatar_url: string
  }
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/dino-games', label: 'Dino Game', icon: Gamepad2 },
  { href: '/apps', label: 'My Apps', icon: LayoutGrid },
]

export function UserSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession({ authenticated: false }))
  }, [])

  async function logout() {
    await fetch('/api/auth/session', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <TooltipProvider>
      <aside className="flex h-screen w-16 flex-col items-center border-r bg-sidebar py-4 gap-2 sticky top-0">
        {/* Logo */}
        <Link href="/home" className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base mb-2">
          C
        </Link>

        <Separator className="w-8" />

        {/* Nav items */}
        <nav className="flex flex-col gap-1 mt-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        <Separator className="w-8" />

        {/* User avatar */}
        {session?.authenticated && session.user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/home" className="mt-1">
                <Avatar className="size-9 ring-2 ring-sidebar-ring">
                  <AvatarImage src={session.user.avatar_url} alt={session.user.nickname} />
                  <AvatarFallback className="text-xs">{session.user.nickname?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div>
                <p className="font-medium">{session.user.nickname}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-sidebar-foreground/60 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="size-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Logout</TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  )
}
