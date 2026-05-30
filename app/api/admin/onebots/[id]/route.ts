import { db } from '@/lib/db'
import { charonOnebots } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { getLoginInfo } from '@/lib/onebot'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const allowed = ['name', 'baseUrl', 'accessToken', 'isActive']
  const update: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  await db.update(charonOnebots).set(update).where(eq(charonOnebots.id, id))
  const rows = await db.select().from(charonOnebots).where(eq(charonOnebots.id, id)).limit(1)
  return NextResponse.json(rows[0])
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.delete(charonOnebots).where(eq(charonOnebots.id, id))
  return NextResponse.json({ ok: true })
}

// POST /api/admin/onebots/[id]/test — test connectivity
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const rows = await db.select().from(charonOnebots).where(eq(charonOnebots.id, id)).limit(1)
  const bot = rows[0]
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const info = await getLoginInfo({ baseUrl: bot.baseUrl, accessToken: bot.accessToken })
    return NextResponse.json({ ok: true, bot_qq: String(info.user_id), nickname: info.nickname })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
