import { db } from '@/lib/db'
import { charonOnebots, charonVerificationSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateVerificationCode,
  getClientIp,
} from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const ip = getClientIp(req)

  const onebots = await db
    .select({ id: charonOnebots.id })
    .from(charonOnebots)
    .where(eq(charonOnebots.isActive, true))
    .limit(1)

  if (onebots.length === 0) {
    return NextResponse.json(
      { error: 'no_onebot_available', error_description: '没有可用的 OneBot 实例，请先在管理后台添加' },
      { status: 400 },
    )
  }

  const code = generateVerificationCode()
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await db.insert(charonVerificationSessions).values({
    id: crypto.randomUUID(),
    token,
    code,
    clientId: '__dashboard__',
    redirectUri: '__dashboard__',
    scopes: ['openid', 'profile', 'email', 'qq'],
    expiresAt,
  })

  return NextResponse.json({
    token,
    code,
    expires_in: 600,
  })
}
