import { db } from '@/lib/db'
import { charonClients, charonVerificationSessions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  generateVerificationCode,
  validateRedirectUri,
  parseScopes,
  filterScopes,
  checkRateLimit,
  getClientIp,
} from '@/lib/utils/oauth'
import { getSessionFromCookies } from '@/lib/session'
import { getQQAvatarUrl } from '@/lib/onebot'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const ip = getClientIp(req)

  if (!checkRateLimit(`verify_start:${ip}`, 30, 60000)) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', error_description: 'Too many requests (30 RPM)' },
      { status: 429 },
    )
  }

  const body = await req.json()
  const {
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    nonce,
    state,
  } = body

  if (!client_id || !redirect_uri) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const clientRows = await db
    .select()
    .from(charonClients)
    .where(and(eq(charonClients.clientId, client_id), eq(charonClients.isActive, true)))
    .limit(1)

  const client = clientRows[0]
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401 })
  }

  if (!validateRedirectUri(redirect_uri, client.redirectUris as string[])) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  if (client.requirePkce && !code_challenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'PKCE required for this client' },
      { status: 400 },
    )
  }

  const requestedScopes = parseScopes(scope ?? 'openid')
  const allowedScopes = filterScopes(requestedScopes, client.allowedScopes as string[])

  const session = await getSessionFromCookies()

  const code = generateVerificationCode()
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.insert(charonVerificationSessions).values({
    id: crypto.randomUUID(),
    token,
    code,
    clientId: client_id,
    redirectUri: redirect_uri,
    scopes: allowedScopes,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge ? (code_challenge_method ?? 'S256') : null,
    nonce,
    state,
    expiresAt,
    verified: !!session,
    qqId: session?.user.qqId ?? null,
  })

  const response: Record<string, unknown> = {
    token,
    code,
    expires_in: 600,
    groups: client.allowedGroups,
  }

  if (session) {
    response.already_verified = true
    response.user = {
      id: session.user.id,
      qq_id: session.user.qqId,
      nickname: session.user.nickname,
      avatar_url: getQQAvatarUrl(session.user.qqId, 640),
      email: session.user.email,
    }
  }

  return NextResponse.json(response)
}
