'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Shield, Copy, Check, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { SCOPE_DESCRIPTIONS } from '@/lib/utils/oauth'

type Step = 'verify' | 'consent' | 'done' | 'error'

interface VerificationData {
  token: string
  code: string
  groups: string[]
  expires_in: number
}

interface UserData {
  id: string
  qq_id: string
  nickname: string
  avatar_url: string
  email: string
}

export default function AuthorizePage() {
  const params = useSearchParams()
  const router = useRouter()

  const clientId = params.get('client_id') ?? ''
  const redirectUri = params.get('redirect_uri') ?? ''
  const scope = params.get('scope') ?? 'openid'
  const state = params.get('state') ?? ''
  const nonce = params.get('nonce') ?? ''
  const codeChallenge = params.get('code_challenge') ?? ''
  const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256'

  const [step, setStep] = useState<Step>('verify')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [verif, setVerif] = useState<VerificationData | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [copied, setCopied] = useState(false)
  const [scopes, setScopes] = useState<string[]>([])
  const [clientName, setClientName] = useState('')
  const [clientLogo, setClientLogo] = useState('')

  // Start verification session on mount
  useEffect(() => {
    if (!clientId || !redirectUri) {
      setStep('error')
      setError('Missing required parameters: client_id or redirect_uri')
      return
    }
    startVerification()
  }, [clientId])

  async function startVerification() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          code_challenge: codeChallenge || undefined,
          code_challenge_method: codeChallengeMethod || undefined,
          nonce: nonce || undefined,
          state: state || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStep('error')
        setError(data.error_description ?? data.error ?? 'Failed to start verification')
        return
      }
      setVerif(data)
      setScopes(scope.split(' ').filter(Boolean))
      setClientName(data.client_name ?? clientId)
      setClientLogo(data.client_logo ?? '')
      setStep('verify')
    } catch (e) {
      setStep('error')
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkVerification = useCallback(async () => {
    if (!verif) return
    setChecking(true)
    try {
      const res = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verif.token }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setError('请求过于频繁，请稍后再试 (30 RPM limit)')
        return
      }
      if (!res.ok) {
        setError(data.error_description ?? data.error ?? '验证失败')
        return
      }
      if (data.verified) {
        setUser(data.user)
        setError('')
        setStep('consent')
      } else {
        setError('未找到验证码消息，请确认您已在群中发送了验证码')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setChecking(false)
    }
  }, [verif])

  async function handleConsent(granted: boolean) {
    if (!verif) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verif.token,
          granted,
          scopes: granted ? scopes : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Consent failed')
        return
      }
      // Also create dashboard session
      if (granted && user) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qq_id: user.qq_id }),
        })
      }
      window.location.href = data.redirect_uri
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    if (!verif) return
    navigator.clipboard.writeText(verif.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !verif) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="size-5 text-destructive" />
              </div>
              <div>
                <CardTitle>授权失败</CardTitle>
                <CardDescription>Authorization Error</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            C
          </div>
          <div className="text-sm text-muted-foreground">Charon Auth</div>
        </div>

        <Card>
          {step === 'verify' && verif && (
            <>
              <CardHeader>
                <CardTitle className="text-xl">QQ 验证登录</CardTitle>
                <CardDescription>
                  {clientName
                    ? `${clientName} 正在请求访问您的账户`
                    : '请通过 QQ 验证您的身份'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Verification code */}
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="mb-2 text-sm text-muted-foreground">在以下任意一个 QQ 群发送验证码：</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-2xl font-bold tracking-widest text-foreground">
                      {verif.code}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyCode}>
                      {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  {verif.groups && verif.groups.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {verif.groups.map((g) => (
                        <Badge key={g} variant="secondary" className="font-mono text-xs">
                          群 {g}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scopes preview */}
                <div>
                  <p className="mb-2 text-sm font-medium">授权后将允许访问：</p>
                  <div className="space-y-1.5">
                    {scopes.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="size-3.5 shrink-0" />
                        <span>{SCOPE_DESCRIPTIONS[s] ?? s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={checkVerification}
                  disabled={checking}
                >
                  {checking ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />检查中…</>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      已发送，检查验证
                    </>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={startVerification} disabled={loading}>
                  <RefreshCw className="size-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 'consent' && user && (
            <>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarImage src={user.avatar_url} alt={user.nickname} />
                    <AvatarFallback>{user.nickname?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.nickname}</CardTitle>
                    <CardDescription className="font-mono">{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{clientName || clientId}</strong> 请求获取以下权限：
                </p>
                <div className="space-y-2">
                  {scopes.map((s) => (
                    <div key={s} className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm">
                      <Shield className="size-4 shrink-0 text-primary" />
                      <span>{SCOPE_DESCRIPTIONS[s] ?? s}</span>
                    </div>
                  ))}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleConsent(false)} disabled={loading}>
                  拒绝
                </Button>
                <Button className="flex-1" onClick={() => handleConsent(true)} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  允许授权
                </Button>
              </CardFooter>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          由 Charon 提供安全认证服务 · 验证码有效期 10 分钟
        </p>
      </div>
    </div>
  )
}
