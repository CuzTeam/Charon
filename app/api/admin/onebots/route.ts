import { db } from '@/lib/db'
import { charonOnebots } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { maskSecret } from '@/lib/utils/oauth'
import { eq } from 'drizzle-orm'
import { getLoginInfo } from '@/lib/onebot'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

export async function GET() {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const bots = await db.select().from(charonOnebots).orderBy(charonOnebots.createdAt)
  const masked = bots.map((b) => ({ ...b, accessToken: maskSecret(b.accessToken) }))
  return NextResponse.json(masked)
}

export async function POST(req: Request) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { name, baseUrl, accessToken } = body

  if (!name || !baseUrl) {
    return NextResponse.json({ error: 'name and baseUrl required' }, { status: 400 })
  }

  // Try to auto-detect bot QQ
  let botQq: string | undefined
  try {
    const info = await getLoginInfo({ baseUrl, accessToken })
    botQq = String(info.user_id)
  } catch { /* ignore */ }

  const id = crypto.randomUUID()
  await db.insert(charonOnebots).values({
    id, name, baseUrl, accessToken: accessToken || null, botQq: botQq ?? null, isActive: true,
  })

  const rows = await db.select().from(charonOnebots).where(eq(charonOnebots.id, id)).limit(1)
  const masked = { ...rows[0], accessToken: maskSecret(rows[0].accessToken) }
  return NextResponse.json(masked, { status: 201 })
}
