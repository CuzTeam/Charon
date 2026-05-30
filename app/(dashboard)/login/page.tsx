'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary font-bold text-xl text-primary-foreground">
            C
          </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">登录 Charon</CardTitle>
            <CardDescription>使用 QQ 验证登录您的账户</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}>
              <LoginInner />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Charon · QQ-based OpenID Connect Provider
        </p>
      </div>
    </div>
  )
}

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/home'
  return <LoginForm next={next} />
}

function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<'start' | 'verify'>('start')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [groups, setGroups] = useState<string[]>([])
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  async function start() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'charon-dashboard',
          redirect_uri: `${window.location.origin}/home`,
          scope: 'openid profile email qq',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error_description ?? data.error ?? '无法启动验证')
        return
      }
      setCode(data.code)
      setGroups(data.groups ?? [])
      setToken(data.token)
      setStep('verify')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function check() {
    setChecking(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.status === 429) { setError('请求过于频繁，请稍后再试'); return }
      if (!res.ok) { setError(data.error ?? '验证失败'); return }
      if (!data.verified) { setError('未找到验证码，请确认已在群中发送'); return }

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qq_id: data.user.qq_id }),
      })
      router.push(next)
      router.refresh()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setChecking(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'start') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-3 text-sm text-muted-foreground space-y-2">
          <p className="flex items-center gap-2"><Shield className="size-4 shrink-0" /> 在 QQ 群中发送验证码</p>
          <p className="flex items-center gap-2"><Shield className="size-4 shrink-0" /> 无需输入 QQ 号</p>
        </div>
        <Button className="w-full" onClick={start} disabled={loading}>
          {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />启动中…</> : '开始 QQ 验证'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/40 p-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">在以下群中发送此验证码</p>
        <p className="text-2xl font-bold tracking-widest font-mono">{code}</p>
        <button className="text-xs text-muted-foreground mt-1 hover:text-foreground" onClick={copy}>
          {copied ? '已复制 ✓' : '点击复制'}
        </button>
        {groups.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">群：{groups.join(', ')}</p>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      <Button className="w-full" onClick={check} disabled={checking}>
        {checking ? <><Loader2 className="mr-2 size-4 animate-spin" />检查中…</> : '已发送，检查验证'}
      </Button>
      <Button variant="ghost" className="w-full text-xs" onClick={() => setStep('start')}>
        重新开始
      </Button>
    </div>
  )
}
