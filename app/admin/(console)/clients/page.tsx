'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Trash2, Copy, Check, AppWindow, Eye, EyeOff } from 'lucide-react'

interface Client {
  id: string
  clientId: string
  clientSecret: string
  name: string
  description: string | null
  logoUrl: string | null
  redirectUris: string[]
  allowedScopes: string[]
  allowedGroups: string[]
  onebotIds: string[]
  requirePkce: boolean
  isActive: boolean
  accessTokenTtl: number
  refreshTokenTtl: number
  idTokenTtl: number
  createdAt: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    name: '', description: '', redirectUris: '',
    allowedScopes: 'openid profile email qq',
    allowedGroups: '', onebotIds: '',
    requirePkce: true, accessTokenTtl: 3600,
    refreshTokenTtl: 2592000, idTokenTtl: 3600,
  })

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then(setClients)
      .finally(() => setLoading(false))
  }, [])

  async function createClient() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          redirectUris: form.redirectUris.split('\n').map((s) => s.trim()).filter(Boolean),
          allowedScopes: form.allowedScopes.split(/\s+/).filter(Boolean),
          allowedGroups: form.allowedGroups.split('\n').map((s) => s.trim()).filter(Boolean),
          onebotIds: form.onebotIds.split('\n').map((s) => s.trim()).filter(Boolean),
          requirePkce: form.requirePkce,
          accessTokenTtl: form.accessTokenTtl,
          refreshTokenTtl: form.refreshTokenTtl,
          idTokenTtl: form.idTokenTtl,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Create failed'); return }
      setClients((prev) => [...prev, data])
      setCreateOpen(false)
      setForm({ name: '', description: '', redirectUris: '', allowedScopes: 'openid profile email qq', allowedGroups: '', onebotIds: '', requirePkce: true, accessTokenTtl: 3600, refreshTokenTtl: 2592000, idTokenTtl: 3600 })
    } catch { setError('Network error') }
    finally { setCreating(false) }
  }

  async function deleteClient(id: string) {
    if (!confirm('Delete this client?')) return
    await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
    setClients((prev) => prev.filter((c) => c.id !== id))
  }

  async function toggleActive(client: Client) {
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !client.isActive }),
    })
    const data = await res.json()
    setClients((prev) => prev.map((c) => c.id === client.id ? data : c))
  }

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000)
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">OAuth 2.0 / OIDC clients</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" />New Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create OAuth Client</DialogTitle>
              <DialogDescription>Register a new OIDC / OAuth 2.0 client application</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My App" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Redirect URIs (one per line) *</Label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.redirectUris}
                  onChange={(e) => setForm(f => ({ ...f, redirectUris: e.target.value }))}
                  placeholder="https://myapp.com/callback"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Allowed Scopes (space separated)</Label>
                <Input value={form.allowedScopes} onChange={(e) => setForm(f => ({ ...f, allowedScopes: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Allowed QQ Groups (one per line)</Label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.allowedGroups}
                  onChange={(e) => setForm(f => ({ ...f, allowedGroups: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Access Token TTL (s)</Label>
                  <Input type="number" value={form.accessTokenTtl} onChange={(e) => setForm(f => ({ ...f, accessTokenTtl: +e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Refresh Token TTL (s)</Label>
                  <Input type="number" value={form.refreshTokenTtl} onChange={(e) => setForm(f => ({ ...f, refreshTokenTtl: +e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>ID Token TTL (s)</Label>
                  <Input type="number" value={form.idTokenTtl} onChange={(e) => setForm(f => ({ ...f, idTokenTtl: +e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label className="cursor-pointer">Require PKCE</Label>
                <Switch checked={form.requirePkce} onCheckedChange={(v) => setForm(f => ({ ...f, requirePkce: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createClient} disabled={creating || !form.name}>
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed text-muted-foreground">
          <AppWindow className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No clients yet. Create your first OAuth client.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {client.name}
                      <Badge variant={client.isActive ? 'default' : 'secondary'} className="text-xs">
                        {client.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {client.requirePkce && <Badge variant="outline" className="text-xs">PKCE</Badge>}
                    </CardTitle>
                    {client.description && <CardDescription>{client.description}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={client.isActive} onCheckedChange={() => toggleActive(client)} />
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => deleteClient(client.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3 space-y-3">
                {/* Client ID */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Client ID</span>
                  <code className="text-xs font-mono flex-1 truncate bg-muted rounded px-2 py-1">{client.clientId}</code>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => copy(`id-${client.id}`, client.clientId)}>
                    {copied[`id-${client.id}`] ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                {/* Client Secret */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Client Secret</span>
                  <code className="text-xs font-mono flex-1 truncate bg-muted rounded px-2 py-1">
                    {showSecret[client.id] ? client.clientSecret : '•'.repeat(32)}
                  </code>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowSecret(p => ({ ...p, [client.id]: !p[client.id] }))}>
                    {showSecret[client.id] ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => copy(`sec-${client.id}`, client.clientSecret)}>
                    {copied[`sec-${client.id}`] ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                  </Button>
                </div>
                {/* Redirect URIs */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 pt-1">Redirect URIs</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(client.redirectUris as string[]).map((uri) => (
                      <Badge key={uri} variant="secondary" className="font-mono text-xs">{uri}</Badge>
                    ))}
                  </div>
                </div>
                {/* Scopes */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0 pt-1">Scopes</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {(client.allowedScopes as string[]).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                {/* Groups */}
                {(client.allowedGroups as string[]).length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 pt-1">QQ Groups</span>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {(client.allowedGroups as string[]).map((g) => (
                        <Badge key={g} variant="secondary" className="font-mono text-xs">群 {g}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                  <span>Access: {client.accessTokenTtl}s</span>
                  <span>Refresh: {client.refreshTokenTtl}s</span>
                  <span>ID: {client.idTokenTtl}s</span>
                  <span className="ml-auto">Created {new Date(client.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
