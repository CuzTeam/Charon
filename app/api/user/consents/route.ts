// GET /api/user/consents — list active consents with client info
import { db } from '@/lib/db'
import { charonConsents, charonClients } from '@/lib/db/schema'
import { getSessionFromCookies } from '@/lib/session'
import { eq, and, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const consents = await db
    .select({ consent: charonConsents, client: charonClients })
    .from(charonConsents)
    .innerJoin(charonClients, eq(charonConsents.clientId, charonClients.clientId))
    .where(
      and(
        eq(charonConsents.userId, session.user.id),
        isNull(charonConsents.revokedAt),
      ),
    )

  return NextResponse.json(consents)
}
