'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getIssuer } from '@/lib/jwt'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-48 shrink-0">{label}</span>
      <code className="text-xs font-mono flex-1 truncate bg-muted rounded px-2 py-1">{value}</code>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy}>
        {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
      </Button>
    </div>
  )
}

export default function OAuthSettingsPage() {
  // We reference env var for the base URL dynamically
  const issuer =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.CHARON_BASE_URL ?? 'https://your-charon-domain.com'

  const endpoints = [
    { label: 'Issuer', value: issuer },
    { label: 'Discovery', value: `${issuer}/.well-known/openid-configuration` },
    { label: 'Authorization', value: `${issuer}/authorize` },
    { label: 'Token', value: `${issuer}/api/oauth/token` },
    { label: 'UserInfo', value: `${issuer}/api/oauth/userinfo` },
    { label: 'JWKS', value: `${issuer}/api/oauth/jwks` },
    { label: 'Revocation', value: `${issuer}/api/oauth/revoke` },
    { label: 'Introspection', value: `${issuer}/api/oauth/introspect` },
  ]

  const scopes = [
    { name: 'openid', desc: 'Required. Issues ID token.' },
    { name: 'profile', desc: 'Name, avatar, gender, level, login_days.' },
    { name: 'email', desc: 'QQ email (qqid@qq.com).' },
    { name: 'qq', desc: 'Raw QQ ID number.' },
    { name: 'offline_access', desc: 'Issues a refresh token.' },
  ]

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">OAuth / OIDC Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Endpoint reference and protocol configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints</CardTitle>
          <CardDescription>Standard OIDC discovery-compatible endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {endpoints.map((e) => <CopyField key={e.label} {...e} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Scopes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scopes.map((s) => (
            <div key={s.name} className="flex items-start gap-3">
              <Badge variant="secondary" className="font-mono text-xs w-28 justify-center shrink-0">{s.name}</Badge>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protocol Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            ['Signing Algorithm', 'RS256'],
            ['Token Endpoint Auth', 'client_secret_post, client_secret_basic'],
            ['PKCE', 'S256 (default), plain'],
            ['Response Types', 'code'],
            ['Grant Types', 'authorization_code, refresh_token'],
            ['Refresh Token Rotation', 'Enabled'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-muted-foreground w-48 shrink-0">{k}</span>
              <code className="font-mono text-xs">{v}</code>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
