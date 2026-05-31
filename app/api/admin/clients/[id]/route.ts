import { db } from '@/lib/db'
import { charonClients } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { maskSecret, hashClientSecret } from '@/lib/utils/oauth'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

// GET /api/admin/clients/[id]
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const rows = await db.select().from(charonClients).where(eq(charonClients.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const masked = { ...rows[0], clientSecret: maskSecret(rows[0].clientSecret) }
  return NextResponse.json(masked)
}

// PATCH /api/admin/clients/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()

  const allowed = [
    'name', 'description', 'logoUrl', 'redirectUris', 'allowedScopes',
    'allowedGroups', 'onebotIds', 'requirePkce', 'isActive',
    'accessTokenTtl', 'refreshTokenTtl', 'idTokenTtl', 'tokenEndpointAuthMethod',
  ]
  const update: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await db.update(charonClients).set(update).where(eq(charonClients.id, id))
  const rows = await db.select().from(charonClients).where(eq(charonClients.id, id)).limit(1)
  const masked = { ...rows[0], clientSecret: maskSecret(rows[0].clientSecret) }
  return NextResponse.json(masked)
}

// POST /api/admin/clients/[id] — regenerate client secret
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const newSecretPlain = crypto.randomBytes(32).toString('hex')
  const newSecretHashed = hashClientSecret(newSecretPlain)
  await db.update(charonClients).set({ clientSecret: newSecretHashed, updatedAt: new Date() }).where(eq(charonClients.id, id))
  const rows = await db.select().from(charonClients).where(eq(charonClients.id, id)).limit(1)
  return NextResponse.json({ ...rows[0], client_secret: newSecretPlain })
}

// DELETE /api/admin/clients/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.delete(charonClients).where(eq(charonClients.id, id))
  return NextResponse.json({ ok: true })
}
