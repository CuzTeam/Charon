'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ScrollText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  actorType: string
  actorId: string | null
  targetType: string | null
  targetId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  'token.issued': 'bg-green-100 text-green-800 dark:bg-green-900/30',
  'token.refreshed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
  'consent.granted': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30',
  'consent.denied': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30',
  'consent.revoked': 'bg-red-100 text-red-800 dark:bg-red-900/30',
  'user.verified': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 50

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/audit-logs?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [page])

  const filtered = search
    ? logs.filter((l) =>
        l.action.includes(search) ||
        l.actorId?.includes(search) ||
        l.targetId?.includes(search) ||
        l.ipAddress?.includes(search),
      )
    : logs

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} total events</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filter by action, actor, target, IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed text-muted-foreground">
          <ScrollText className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No audit logs found</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-40">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-40">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actor</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[160px]">
                    <span className="text-muted-foreground">{log.actorType}:</span>{' '}
                    {log.actorId ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[160px]">
                    {log.targetType ? (
                      <>
                        <span className="text-muted-foreground">{log.targetType}:</span>{' '}
                        {log.targetId ?? '-'}
                      </>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{log.ipAddress ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
