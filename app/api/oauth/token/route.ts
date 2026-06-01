import { db } from '@/lib/db'
import {
  charonAuthorizationCodes,
  charonAccessTokens,
  charonRefreshTokens,
  charonClients,
  charonUsers,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { signJwt, getIssuer } from '@/lib/jwt'
import { verifyCodeChallenge, corsHeadersForOrigin, getClientIp, verifyClientSecret } from '@/lib/utils/oauth'
import { writeAuditLog } from '@/lib/session'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: await corsHeadersForOrigin(req) })
}

export async function POST(req: Request) {
  const headers = await corsHeadersForOrigin(req)
  headers['Cache-Control'] = 'no-store'
  headers['Pragma'] = 'no-cache'

  let body: Record<string, string>
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    body = await req.json()
  } else {
    const text = await req.text()
    const params = new URLSearchParams(text)
    body = Object.fromEntries(params.entries())
  }

  // Support Basic auth for client credentials
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString()
    const colonIndex = decoded.indexOf(':')
    if (colonIndex !== -1) {
      if (!body.client_id) body.client_id = decoded.slice(0, colonIndex)
      if (!body.client_secret) body.client_secret = decoded.slice(colonIndex + 1)
    }
  }

  const grantType = body.grant_type
  const ip = getClientIp(req)

  if (grantType === 'authorization_code') {
    return handleAuthorizationCode(body, ip, headers)
  }
  if (grantType === 'refresh_token') {
    return handleRefreshToken(body, ip, headers)
  }

  return NextResponse.json(
    { error: 'unsupported_grant_type' },
    { status: 400, headers },
  )
}

async function handleAuthorizationCode(
  body: Record<string, string>,
  ip: string,
  headers: Record<string, string>,
) {
  const { code, redirect_uri, client_id, client_secret, code_verifier } = body

  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
  }

  // Atomically claim the auth code to prevent race conditions
  const claimed = await db
    .update(charonAuthorizationCodes)
    .set({ used: true })
    .where(
      and(
        eq(charonAuthorizationCodes.code, code),
        eq(charonAuthorizationCodes.used, false),
      ),
    )
    .returning({ id: charonAuthorizationCodes.id })

  if (claimed.length === 0) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers })
  }

  // Fetch the claimed auth code details
  const codeRows = await db
    .select()
    .from(charonAuthorizationCodes)
    .where(eq(charonAuthorizationCodes.id, claimed[0].id))
    .limit(1)

  const authCode = codeRows[0]
  if (!authCode || authCode.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers })
  }

  if (authCode.clientId !== client_id) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }

  if (authCode.redirectUri !== redirect_uri) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers })
  }

  // Verify client
  const clientRows = await db
    .select()
    .from(charonClients)
    .where(and(eq(charonClients.clientId, client_id), eq(charonClients.isActive, true)))
    .limit(1)
  const client = clientRows[0]
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }

  if (client.tokenEndpointAuthMethod === 'none') {
    // no client secret required
  } else if (!client_secret) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'client_secret is required' }, { status: 401, headers })
  } else if (!verifyClientSecret(client_secret, client.clientSecret)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }

  // Verify PKCE
  if (authCode.codeChallenge) {
    if (!code_verifier) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'code_verifier required' }, { status: 400, headers })
    }
    const valid = verifyCodeChallenge(
      code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod ?? 'S256',
    )
    if (!valid) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400, headers })
    }
  }

  // Fetch user
  const userRows = await db
    .select()
    .from(charonUsers)
    .where(eq(charonUsers.id, authCode.userId))
    .limit(1)
  const user = userRows[0]
  if (!user) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers })
  }

  const issuer = getIssuer()
  const scopes = authCode.scopes as string[]
  const now = Math.floor(Date.now() / 1000)

  // Build ID token claims
  const idTokenClaims: Record<string, unknown> = {
    iss: issuer,
    sub: `qq:${user.qqId}`,
    aud: client_id,
    iat: now,
    exp: now + client.idTokenTtl,
    nonce: authCode.nonce,
    auth_time: now,
  }

  if (scopes.includes('email')) {
    idTokenClaims.email = user.email
    idTokenClaims.email_verified = true
  }
  if (scopes.includes('profile')) {
    idTokenClaims.name = user.nickname
    idTokenClaims.nickname = user.nickname
    idTokenClaims.preferred_username = user.nickname
    idTokenClaims.picture = user.avatarUrl
    idTokenClaims.gender = user.sex
    idTokenClaims.updated_at = Math.floor((user.updatedAt?.getTime() ?? Date.now()) / 1000)
  }
  if (scopes.includes('qq')) {
    idTokenClaims.qq_id = user.qqId
  }

  const idToken = await signJwt(idTokenClaims, client.idTokenTtl)

  // Create access token (opaque)
  const accessToken = crypto.randomBytes(32).toString('hex')
  await db.insert(charonAccessTokens).values({
    id: crypto.randomUUID(),
    token: accessToken,
    clientId: client_id,
    userId: user.id,
    scopes,
    expiresAt: new Date(Date.now() + client.accessTokenTtl * 1000),
  })

  const tokenResponse: Record<string, unknown> = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: client.accessTokenTtl,
    id_token: idToken,
    scope: scopes.join(' '),
  }

  // Optionally issue refresh token
  if (scopes.includes('offline_access') || client.grantTypes.includes('refresh_token')) {
    const refreshToken = crypto.randomBytes(40).toString('hex')
    await db.insert(charonRefreshTokens).values({
      id: crypto.randomUUID(),
      token: refreshToken,
      clientId: client_id,
      userId: user.id,
      scopes,
      expiresAt: new Date(Date.now() + client.refreshTokenTtl * 1000),
    })
    tokenResponse.refresh_token = refreshToken
  }

  await writeAuditLog({
    action: 'token.issued',
    actorType: 'user',
    actorId: user.id,
    targetType: 'client',
    targetId: client_id,
    ipAddress: ip,
    metadata: { scopes },
  })

  return NextResponse.json(tokenResponse, { headers })
}

async function handleRefreshToken(
  body: Record<string, string>,
  ip: string,
  headers: Record<string, string>,
) {
  const { refresh_token, client_id, client_secret } = body

  if (!refresh_token || !client_id) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
  }

  const rows = await db
    .select()
    .from(charonRefreshTokens)
    .where(
      and(
        eq(charonRefreshTokens.token, refresh_token),
        eq(charonRefreshTokens.revoked, false),
      ),
    )
    .limit(1)

  const rt = rows[0]
  if (!rt || rt.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400, headers })
  }
  if (rt.clientId !== client_id) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }

  const clientRows = await db
    .select()
    .from(charonClients)
    .where(and(eq(charonClients.clientId, client_id), eq(charonClients.isActive, true)))
    .limit(1)
  const client = clientRows[0]
  if (!client) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }
  if (client.tokenEndpointAuthMethod === 'none') {
    // no client secret required
  } else if (!client_secret) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'client_secret is required' }, { status: 401, headers })
  } else if (!verifyClientSecret(client_secret, client.clientSecret)) {
    return NextResponse.json({ error: 'invalid_client' }, { status: 401, headers })
  }

  // Rotate refresh token
  await db
    .update(charonRefreshTokens)
    .set({ revoked: true })
    .where(eq(charonRefreshTokens.id, rt.id))

  const newRefreshToken = crypto.randomBytes(40).toString('hex')
  await db.insert(charonRefreshTokens).values({
    id: crypto.randomUUID(),
    token: newRefreshToken,
    clientId: client_id,
    userId: rt.userId,
    scopes: rt.scopes as string[],
    expiresAt: new Date(Date.now() + client.refreshTokenTtl * 1000),
  })

  const newAccessToken = crypto.randomBytes(32).toString('hex')
  await db.insert(charonAccessTokens).values({
    id: crypto.randomUUID(),
    token: newAccessToken,
    clientId: client_id,
    userId: rt.userId,
    scopes: rt.scopes as string[],
    expiresAt: new Date(Date.now() + client.accessTokenTtl * 1000),
  })

  await writeAuditLog({
    action: 'token.refreshed',
    actorType: 'user',
    actorId: rt.userId,
    targetType: 'client',
    targetId: client_id,
    ipAddress: ip,
  })

  return NextResponse.json(
    {
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: client.accessTokenTtl,
      refresh_token: newRefreshToken,
      scope: (rt.scopes as string[]).join(' '),
    },
    { headers },
  )
}
