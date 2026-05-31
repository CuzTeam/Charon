import { db } from '@/lib/db'
import { charonAccessTokens, charonClients, charonUsers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { corsHeadersForOrigin, verifyClientSecret } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: await corsHeadersForOrigin(req) })
}

export async function POST(req: Request) {
  const headers = await corsHeadersForOrigin(req)

  let body: Record<string, string> = {}
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    body = await req.json()
  } else {
    const form = await req.formData()
    body = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, v.toString()]))
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString()
    const [clientId, clientSecret] = decoded.split(':')
    if (!body.client_id) body.client_id = clientId
    if (!body.client_secret) body.client_secret = decodeURIComponent(clientSecret)
  }

  const { client_id, client_secret } = body

  const clientRows = await db
    .select()
    .from(charonClients)
    .where(and(eq(charonClients.clientId, client_id), eq(charonClients.isActive, true)))
    .limit(1)
  const client = clientRows[0]

  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client' },
      { status: 401, headers },
    )
  }

  if (client.tokenEndpointAuthMethod !== 'none' && !verifyClientSecret(client_secret ?? '', client.clientSecret)) {
    return NextResponse.json(
      { error: 'invalid_client' },
      { status: 401, headers },
    )
  }

  const token = body.token

  if (!token) {
    return NextResponse.json(
      { active: false },
      { status: 200, headers },
    )
  }

  const rows = await db
    .select({ at: charonAccessTokens, user: charonUsers })
    .from(charonAccessTokens)
    .innerJoin(charonUsers, eq(charonAccessTokens.userId, charonUsers.id))
    .where(and(eq(charonAccessTokens.token, token), eq(charonAccessTokens.revoked, false)))
    .limit(1)

  const row = rows[0]
  if (!row || row.at.expiresAt < new Date()) {
    return NextResponse.json({ active: false }, { headers })
  }

  return NextResponse.json(
    {
      active: true,
      sub: row.user.id,
      username: row.user.nickname,
      scope: (row.at.scopes as string[]).join(' '),
      client_id: row.at.clientId,
      token_type: 'Bearer',
      exp: Math.floor(row.at.expiresAt.getTime() / 1000),
      iat: Math.floor(row.at.createdAt.getTime() / 1000),
    },
    { headers },
  )
}
