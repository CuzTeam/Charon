import { db } from '@/lib/db'
import { charonClients, charonVerificationSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateVerificationCode,
  checkRateLimit,
  getClientIp,
} from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const ip = getClientIp(req)

  if (!checkRateLimit(`dashboard_start:${ip}`, 30, 60000)) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', error_description: '请求过于频繁 (30 RPM)' },
      { status: 429 },
    )
  }

  const allClients = await db
    .select({ allowedGroups: charonClients.allowedGroups })
    .from(charonClients)
    .where(eq(charonClients.isActive, true))

  const groups = [...new Set(allClients.flatMap((c) => c.allowedGroups as string[]))]

  if (groups.length === 0) {
    return NextResponse.json(
      { error: 'no_groups_configured', error_description: '没有配置任何 QQ 群，请先在管理后台配置客户端和群组' },
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
    groups,
  })
}
