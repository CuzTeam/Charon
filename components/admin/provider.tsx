'use client'

import { useState, useEffect } from 'react'
import { AdminShell } from '@/components/admin/shell'
import { AdminLoginForm } from '@/components/admin/login-form'
import { Loader2 } from 'lucide-react'

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => {
        setAuthed(r.ok)
      })
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!authed) {
    return <AdminLoginForm onLogin={() => setAuthed(true)} />
  }

  return <AdminShell>{children}</AdminShell>
}
