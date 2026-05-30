import { db } from '@/lib/db'
import { charonAccessTokens, charonClients, charonRefreshTokens } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { corsHeadersForOrigin } from '@/lib/utils/oauth'
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

  const { client_id, client_secret, token, token_type_hint } = body

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

  if (client.tokenEndpointAuthMethod !== 'none' && client.clientSecret !== client_secret) {
    return NextResponse.json(
      { error: 'invalid_client' },
      { status: 401, headers },
    )
  }

  if (!token) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
  }

  if (!token_type_hint || token_type_hint === 'access_token') {
    const atRows = await db
      .select({ clientId: charonAccessTokens.clientId })
      .from(charonAccessTokens)
      .where(eq(charonAccessTokens.token, token))
      .limit(1)
    if (atRows.length > 0 && atRows[0].clientId === client_id) {
      await db
        .update(charonAccessTokens)
        .set({ revoked: true })
        .where(eq(charonAccessTokens.token, token))
    }
  }

  if (!token_type_hint || token_type_hint === 'refresh_token') {
    const rtRows = await db
      .select({ clientId: charonRefreshTokens.clientId })
      .from(charonRefreshTokens)
      .where(eq(charonRefreshTokens.token, token))
      .limit(1)
    if (rtRows.length > 0 && rtRows[0].clientId === client_id) {
      await db
        .update(charonRefreshTokens)
        .set({ revoked: true })
        .where(eq(charonRefreshTokens.token, token))
    }
  }

  return new Response(null, { status: 200, headers })
}
