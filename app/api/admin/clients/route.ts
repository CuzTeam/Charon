import { db } from '@/lib/db'
import { charonClients } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

// GET /api/admin/clients
export async function GET() {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const clients = await db.select().from(charonClients).orderBy(charonClients.createdAt)
  return NextResponse.json(clients)
}

// POST /api/admin/clients — create
export async function POST(req: Request) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const {
    name, description, logoUrl, redirectUris, allowedScopes,
    allowedGroups, onebotIds, requirePkce, accessTokenTtl,
    refreshTokenTtl, idTokenTtl, tokenEndpointAuthMethod,
  } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const id = crypto.randomUUID()
  const clientId = crypto.randomUUID()
  const clientSecret = crypto.randomBytes(32).toString('hex')

  await db.insert(charonClients).values({
    id,
    clientId,
    clientSecret,
    name,
    description,
    logoUrl,
    redirectUris: redirectUris ?? [],
    allowedScopes: allowedScopes ?? ['openid', 'profile', 'email'],
    allowedGroups: allowedGroups ?? [],
    onebotIds: onebotIds ?? [],
    requirePkce: requirePkce ?? true,
    accessTokenTtl: accessTokenTtl ?? 3600,
    refreshTokenTtl: refreshTokenTtl ?? 2592000,
    idTokenTtl: idTokenTtl ?? 3600,
    tokenEndpointAuthMethod: tokenEndpointAuthMethod ?? 'client_secret_post',
  })

  const rows = await db.select().from(charonClients).where(eq(charonClients.id, id)).limit(1)
  return NextResponse.json(rows[0], { status: 201 })
}
