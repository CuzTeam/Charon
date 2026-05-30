'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, LayoutGrid, ShieldCheck } from 'lucide-react'
import { SCOPE_DESCRIPTIONS } from '@/lib/utils/oauth'

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
    <div className="p-8 max-w-2xl">
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
        <div className="space-y-3">
          {consents.map(({ consent, client }) => (
            <Card key={consent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 rounded-lg">
                    {client.logoUrl ? (
                      <AvatarImage src={client.logoUrl} alt={client.name} />
                    ) : null}
                    <AvatarFallback className="rounded-lg text-sm">{client.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{client.name}</CardTitle>
                    {client.description && (
                      <CardDescription className="truncate">{client.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => revoke(client.clientId)}
                    disabled={revoking === client.clientId}
                  >
                    {revoking === client.clientId ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <><Trash2 className="size-4 mr-1" />撤销</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {(consent.scopes as string[]).map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {SCOPE_DESCRIPTIONS[s] ?? s}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  授权于 {new Date(consent.grantedAt).toLocaleDateString('zh-CN')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
