/**
 * POST /api/auth/consent
 * User grants or denies consent for an OAuth client
 */
import { db } from '@/lib/db'
import {
  charonVerificationSessions,
  charonConsents,
  charonAuthorizationCodes,
  charonUsers,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { writeAuditLog } from '@/lib/session'
import { getClientIp, filterScopes } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const body = await req.json()
  const { token, granted, scopes } = body

  if (!token) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  // Load verification session (already verified)
  const vsRows = await db
    .select()
    .from(charonVerificationSessions)
    .where(
      and(
        eq(charonVerificationSessions.token, token),
        eq(charonVerificationSessions.verified, true),
      ),
    )
    .limit(1)

  const vs = vsRows[0]
  if (!vs || vs.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }

  let userId: string | null = null
  if (vs.qqId) {
    const userRows = await db
      .select({ id: charonUsers.id })
      .from(charonUsers)
      .where(eq(charonUsers.qqId, vs.qqId))
      .limit(1)
    userId = userRows[0]?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 400 })
  }

  if (!granted) {
    await writeAuditLog({
      action: 'consent.denied',
      actorType: 'user',
      actorId: userId,
      targetType: 'client',
      targetId: vs.clientId,
      ipAddress: ip,
    })
    const redirectUrl = new URL(vs.redirectUri)
    redirectUrl.searchParams.set('error', 'access_denied')
    if (vs.state) redirectUrl.searchParams.set('state', vs.state)
    return NextResponse.json({ redirect_uri: redirectUrl.toString() })
  }

  const allowedScopes = vs.scopes as string[]
  const grantedScopes = filterScopes(
    Array.isArray(scopes) ? scopes : allowedScopes,
    allowedScopes,
  )

  // Upsert consent record
  const existing = await db
    .select()
    .from(charonConsents)
    .where(
      and(
        eq(charonConsents.userId, userId),
        eq(charonConsents.clientId, vs.clientId),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(charonConsents)
      .set({ scopes: grantedScopes, revokedAt: null, grantedAt: new Date() })
      .where(eq(charonConsents.id, existing[0].id))
  } else {
    await db.insert(charonConsents).values({
      id: crypto.randomUUID(),
      userId,
      clientId: vs.clientId,
      scopes: grantedScopes,
    })
  }

  // Issue authorization code
  const code = crypto.randomBytes(32).toString('hex')
  await db.insert(charonAuthorizationCodes).values({
    id: crypto.randomUUID(),
    code,
    clientId: vs.clientId,
    userId,
    redirectUri: vs.redirectUri,
    scopes: grantedScopes,
    codeChallenge: vs.codeChallenge,
    codeChallengeMethod: vs.codeChallengeMethod,
    nonce: vs.nonce,
    state: vs.state,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
  })

  await writeAuditLog({
    action: 'consent.granted',
    actorType: 'user',
    actorId: userId,
    targetType: 'client',
    targetId: vs.clientId,
    ipAddress: ip,
    metadata: { scopes: grantedScopes },
  })

  const redirectUrl = new URL(vs.redirectUri)
  redirectUrl.searchParams.set('code', code)
  if (vs.state) redirectUrl.searchParams.set('state', vs.state)

  return NextResponse.json({ redirect_uri: redirectUrl.toString() })
}
