import { db } from '@/lib/db'
import { charonClients, charonUsers, charonAuditLogs, charonOnebots, charonConsents, charonAccessTokens, charonRefreshTokens } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { count, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

// GET /api/admin/stats
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    [userCount],
    [clientCount],
    [onebotCount],
    [auditCount],
    recentLogs,
  ] = await Promise.all([
    db.select({ count: count() }).from(charonUsers),
    db.select({ count: count() }).from(charonClients),
    db.select({ count: count() }).from(charonOnebots),
    db.select({ count: count() }).from(charonAuditLogs),
    db.select().from(charonAuditLogs).orderBy(desc(charonAuditLogs.createdAt)).limit(10),
  ])

  return NextResponse.json({
    users: userCount?.count ?? 0,
    clients: clientCount?.count ?? 0,
    onebots: onebotCount?.count ?? 0,
    audit_logs: auditCount?.count ?? 0,
    recent_logs: recentLogs,
  })
}
