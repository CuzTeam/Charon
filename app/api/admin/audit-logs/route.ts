import { db } from '@/lib/db'
import { charonAuditLogs } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { desc, count } from 'drizzle-orm'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

export async function GET(req: Request) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
  const offset = (page - 1) * limit

  const [logs, [total]] = await Promise.all([
    db
      .select()
      .from(charonAuditLogs)
      .orderBy(desc(charonAuditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(charonAuditLogs),
  ])

  return NextResponse.json({
    logs,
    total: total?.count ?? 0,
    page,
    limit,
  })
}
