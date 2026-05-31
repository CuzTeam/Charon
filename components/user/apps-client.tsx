'use client'

import { useEffect, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataTable, ArrowUpDown } from '@/components/ui/data-table'
import { Loader2, Trash2, LayoutGrid, ShieldCheck } from 'lucide-react'
import { SCOPE_DESCRIPTIONS } from '@/lib/utils/oauth-shared'

interface ConsentRow {
  consent: {
    id: string
    userId: string
    clientId: string
    scopes: string[]
    grantedAt: string
    revokedAt: string | null
  }
  client: {
    clientId: string
    name: string
    description: string | null
    logoUrl: string | null
  }
}

function columns(revoke: (clientId: string) => void, revoking: string | null): ColumnDef<ConsentRow>[] {
  return [
    {
      accessorKey: 'client',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          应用
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const client = row.original.client
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 rounded-lg">
              {client.logoUrl ? <AvatarImage src={client.logoUrl} alt={client.name} /> : null}
              <AvatarFallback className="rounded-lg text-xs">{client.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium">{client.name}</div>
              {client.description && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{client.description}</div>
              )}
            </div>
          </div>
        )
      },
      sortingFn: (a, b) => a.original.client.name.localeCompare(b.original.client.name),
    },
    {
      accessorKey: 'scopes',
      header: '授权范围',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.consent.scopes as string[]).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {SCOPE_DESCRIPTIONS[s] ?? s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'grantedAt',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          授权时间
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.consent.grantedAt).toLocaleDateString('zh-CN'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const clientId = row.original.client.clientId
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => revoke(clientId)}
            disabled={revoking === clientId}
          >
            {revoking === clientId ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <><Trash2 className="size-4 mr-1" />撤销</>
            )}
          </Button>
        )
      },
    },
  ]
}

export function AppsClient({ userId }: { userId: string }) {
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/user/consents')
      .then((r) => r.json())
      .then(setConsents)
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  async function revoke(clientId: string) {
    setRevoking(clientId)
    try {
      await fetch(`/api/user/consents/${clientId}`, { method: 'DELETE' })
      setConsents((prev) => prev.filter((c) => c.client.clientId !== clientId))
    } catch {
      setError('撤销失败，请重试')
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">已授权应用</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {consents.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 rounded-xl border border-dashed">
          <ShieldCheck className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无已授权的应用</p>
        </div>
      ) : (
        <DataTable columns={columns(revoke, revoking)} data={consents} pageSize={10} />
      )}
    </div>
  )
}
