import { db } from '@/lib/db'
import { charonClients } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { maskSecret, hashClientSecret } from '@/lib/utils/oauth'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getAdminSessionFromCookies()
  if (!session) throw new Error('Unauthorized')
}

const VALID_SCOPES = ['openid', 'profile', 'email', 'qq', 'offline_access', 'charon:full']
const VALID_AUTH_METHODS = ['client_secret_post', 'client_secret_basic', 'none']

const createClientSchema = z.object({
  name: z.string().min(1, 'name required'),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  redirectUris: z.array(z.string().url()).optional(),
  allowedScopes: z.array(z.enum(VALID_SCOPES as unknown as [string, ...string[]])).optional(),
  allowedGroups: z.array(z.string()).optional(),
  onebotIds: z.array(z.string()).optional(),
  requirePkce: z.boolean().optional(),
  accessTokenTtl: z.number().int().min(60).max(86400).optional(),
  refreshTokenTtl: z.number().int().min(60).max(31536000).optional(),
  idTokenTtl: z.number().int().min(60).max(86400).optional(),
  tokenEndpointAuthMethod: z.enum(VALID_AUTH_METHODS as unknown as [string, ...string[]]).optional(),
})

// GET /api/admin/clients
export async function GET() {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const clients = await db.select().from(charonClients).orderBy(charonClients.createdAt)
  const masked = clients.map((c) => ({ ...c, clientSecret: maskSecret(c.clientSecret) }))
  return NextResponse.json(masked)
}

// POST /api/admin/clients — create
export async function POST(req: Request) {
  try { await requireAdmin() } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const data = parsed.data
  const id = crypto.randomUUID()
  const clientId = crypto.randomUUID()
  const clientSecretPlain = crypto.randomBytes(32).toString('hex')
  const clientSecretHashed = hashClientSecret(clientSecretPlain)

  await db.insert(charonClients).values({
    id,
    clientId,
    clientSecret: clientSecretHashed,
    name: data.name,
    description: data.description,
    logoUrl: data.logoUrl,
    redirectUris: data.redirectUris ?? [],
    allowedScopes: data.allowedScopes ?? ['openid', 'profile', 'email'],
    allowedGroups: data.allowedGroups ?? [],
    onebotIds: data.onebotIds ?? [],
    requirePkce: data.requirePkce ?? true,
    accessTokenTtl: data.accessTokenTtl ?? 3600,
    refreshTokenTtl: data.refreshTokenTtl ?? 2592000,
    idTokenTtl: data.idTokenTtl ?? 3600,
    tokenEndpointAuthMethod: data.tokenEndpointAuthMethod ?? 'client_secret_post',
  })

  const rows = await db.select().from(charonClients).where(eq(charonClients.id, id)).limit(1)
  return NextResponse.json(
    { ...rows[0], client_secret: clientSecretPlain },
    { status: 201 },
  )
}
