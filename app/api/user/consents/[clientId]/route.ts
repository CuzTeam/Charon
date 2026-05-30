/**
 * User: revoke consent for a client
 * DELETE /api/user/consents/[clientId]
 */
import { db } from '@/lib/db'
import {
  charonConsents,
  charonAccessTokens,
  charonRefreshTokens,
} from '@/lib/db/schema'
import { getSessionFromCookies, writeAuditLog } from '@/lib/session'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const consents = await db
    .select()
    .from(charonConsents)
    .where(and(eq(charonConsents.userId, session.user.id)))

  return NextResponse.json(consents)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params
  const userId = session.user.id

  // Revoke all tokens for this client
  await Promise.all([
    db
      .update(charonAccessTokens)
      .set({ revoked: true })
      .where(and(eq(charonAccessTokens.userId, userId), eq(charonAccessTokens.clientId, clientId))),
    db
      .update(charonRefreshTokens)
      .set({ revoked: true })
      .where(
        and(eq(charonRefreshTokens.userId, userId), eq(charonRefreshTokens.clientId, clientId)),
      ),
    db
      .update(charonConsents)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(charonConsents.userId, userId), eq(charonConsents.clientId, clientId)),
      ),
  ])

  await writeAuditLog({
    action: 'consent.revoked',
    actorType: 'user',
    actorId: userId,
    targetType: 'client',
    targetId: clientId,
  })

  return NextResponse.json({ ok: true })
}
