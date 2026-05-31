'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save } from 'lucide-react'

export default function CustomSettingsPage() {
  const [systemName, setSystemName] = useState('')
  const [systemIcon, setSystemIcon] = useState('')
  const [systemLogoUrl, setSystemLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        setSystemName(data.system_name ?? '')
        setSystemIcon(data.system_icon ?? '')
        setSystemLogoUrl(data.system_logo_url ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_name: systemName,
          system_icon: systemIcon,
          system_logo_url: systemLogoUrl,
        }),
      })
      if (!res.ok) {
        setMessage('Save failed')
        return
      }
      setMessage('Saved successfully')
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customization</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize system name, icon, and logo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>These settings affect the sidebar, login page, and OIDC discovery document</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.includes('failed') || message.includes('error') ? 'destructive' : 'default'}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>System Name</Label>
            <Input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Charon"
            />
            <p className="text-xs text-muted-foreground">Displayed in the sidebar header, browser title, and OIDC discovery</p>
          </div>

          <div className="space-y-1.5">
            <Label>Icon (Emoji or Lucide icon name)</Label>
            <Input
              value={systemIcon}
              onChange={(e) => setSystemIcon(e.target.value)}
              placeholder="fingerprint"
            />
            <p className="text-xs text-muted-foreground">Lucide icon name (e.g. fingerprint, shield, key-round) or an emoji character</p>
          </div>

          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input
              value={systemLogoUrl}
              onChange={(e) => setSystemLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">External logo image URL. If set, replaces the icon in the sidebar header</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save
            </Button>
            <span className="text-xs text-muted-foreground">Changes take effect after page refresh</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>How the sidebar header will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {systemLogoUrl ? (
              <img src={systemLogoUrl} alt="Logo" className="size-8 rounded-lg object-contain" />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {systemIcon && systemIcon.length <= 2 ? systemIcon : systemIcon?.charAt(0)?.toUpperCase() || 'C'}
              </div>
            )}
            <div className="grid text-left text-sm leading-tight">
              <span className="truncate font-semibold">{systemName || 'Charon'}</span>
              <span className="truncate text-xs text-muted-foreground">Admin Console</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
