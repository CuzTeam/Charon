'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, AppWindow, Bot, ScrollText, Activity } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface Stats {
  users: number
  clients: number
  onebots: number
  audit_logs: number
  recent_logs: Array<{
    id: string
    action: string
    actorType: string
    actorId: string | null
    targetType: string | null
    targetId: string | null
    createdAt: string
    metadata: Record<string, unknown> | null
  }>
}

const ACTION_COLORS: Record<string, string> = {
  'token.issued': 'bg-green-100 text-green-700',
  'token.refreshed': 'bg-blue-100 text-blue-700',
  'consent.granted': 'bg-emerald-100 text-emerald-700',
  'consent.denied': 'bg-orange-100 text-orange-700',
  'consent.revoked': 'bg-red-100 text-red-700',
  'user.verified': 'bg-purple-100 text-purple-700',
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Charon system dashboard</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Users" value={stats?.users ?? 0} icon={Users} color="text-blue-500" />
        <StatCard title="Clients" value={stats?.clients ?? 0} icon={AppWindow} color="text-purple-500" />
        <StatCard title="OneBots" value={stats?.onebots ?? 0} icon={Bot} color="text-green-500" />
        <StatCard title="Audit Logs" value={stats?.audit_logs ?? 0} icon={ScrollText} color="text-orange-500" />
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Activity className="size-4" />
          Recent Activity
        </h2>
        <div className="rounded-xl border divide-y">
          {(stats?.recent_logs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No activity yet</p>
          ) : (
            stats?.recent_logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'
                  }`}
                >
                  {log.action}
                </span>
                <span className="text-xs text-muted-foreground font-mono flex-1 truncate">
                  {log.actorId ? `actor: ${log.actorId}` : ''}
                  {log.targetId ? ` → ${log.targetId}` : ''}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(log.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`size-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}
