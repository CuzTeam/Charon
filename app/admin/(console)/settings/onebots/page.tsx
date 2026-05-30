'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Bot, Wifi, WifiOff } from 'lucide-react'

interface OneBot {
  id: string
  name: string
  baseUrl: string
  accessToken: string | null
  botQq: string | null
  isActive: boolean
  createdAt: string
}

export default function OneBotsSettingsPage() {
  const [bots, setBots] = useState<OneBot[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; botQq?: string; nickname?: string; error?: string }>>({})
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', baseUrl: '', accessToken: '' })

  useEffect(() => {
    fetch('/api/admin/onebots')
      .then((r) => r.json())
      .then(setBots)
      .finally(() => setLoading(false))
  }, [])

  async function createBot() {
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/admin/onebots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          baseUrl: form.baseUrl,
          accessToken: form.accessToken || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Create failed'); return }
      setBots((prev) => [...prev, data])
      setCreateOpen(false)
      setForm({ name: '', baseUrl: '', accessToken: '' })
    } catch { setError('Network error') }
    finally { setCreating(false) }
  }

  async function deleteBot(id: string) {
    if (!confirm('Delete this OneBot?')) return
    await fetch(`/api/admin/onebots/${id}`, { method: 'DELETE' })
    setBots((prev) => prev.filter((b) => b.id !== id))
  }

  async function toggleActive(bot: OneBot) {
    const res = await fetch(`/api/admin/onebots/${bot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !bot.isActive }),
    })
    const data = await res.json()
    setBots((prev) => prev.map((b) => b.id === bot.id ? data : b))
  }

  async function testBot(id: string) {
    setTesting((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/admin/onebots/${id}`, { method: 'POST' })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [id]: data }))
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, error: 'Network error' } }))
    } finally {
      setTesting((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">OneBots</h1>
          <p className="text-sm text-muted-foreground mt-0.5">OneBot V11 HTTP instances for QQ verification</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 size-4" />Add OneBot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add OneBot</DialogTitle>
              <DialogDescription>Connect a OneBot V11 HTTP API instance (NapCat compatible)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My QQ Bot" />
              </div>
              <div className="space-y-1.5">
                <Label>Base URL *</Label>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="http://localhost:3000"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">OneBot V11 HTTP API base URL (no trailing slash)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Access Token</Label>
                <Input
                  value={form.accessToken}
                  onChange={(e) => setForm(f => ({ ...f, accessToken: e.target.value }))}
                  placeholder="Optional bearer token"
                  type="password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createBot} disabled={creating || !form.name || !form.baseUrl}>
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed text-muted-foreground">
          <Bot className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No OneBots yet. Add your first instance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => (
            <Card key={bot.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bot className="size-4" />
                      {bot.name}
                      <Badge variant={bot.isActive ? 'default' : 'secondary'} className="text-xs">
                        {bot.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">{bot.baseUrl}</CardDescription>
                    {bot.botQq && (
                      <p className="text-xs text-muted-foreground">Bot QQ: {bot.botQq}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={bot.isActive} onCheckedChange={() => toggleActive(bot)} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testBot(bot.id)}
                      disabled={testing[bot.id]}
                    >
                      {testing[bot.id] ? <Loader2 className="size-3.5 animate-spin" /> : 'Test'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => deleteBot(bot.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {testResults[bot.id] && (
                <>
                  <Separator />
                  <CardContent className="pt-2 pb-3">
                    <div className={`flex items-center gap-2 text-sm ${testResults[bot.id].ok ? 'text-green-600' : 'text-destructive'}`}>
                      {testResults[bot.id].ok
                        ? <><Wifi className="size-4" /> Connected — QQ {testResults[bot.id].botQq} ({testResults[bot.id].nickname})</>
                        : <><WifiOff className="size-4" /> {testResults[bot.id].error}</>
                      }
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
