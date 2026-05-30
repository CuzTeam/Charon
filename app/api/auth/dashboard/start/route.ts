import { db } from '@/lib/db'
import { charonOnebots, charonVerificationSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  generateVerificationCode,
  checkRateLimit,
  getClientIp,
} from '@/lib/utils/oauth'
import { getGroupList } from '@/lib/onebot'
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

  const onebots = await db
    .select()
    .from(charonOnebots)
    .where(eq(charonOnebots.isActive, true))

  if (onebots.length === 0) {
    return NextResponse.json(
      { error: 'no_onebot_available', error_description: '没有可用的 OneBot 实例，请先在管理后台添加' },
      { status: 400 },
    )
  }

  const groupSet = new Set<string>()
  for (const bot of onebots) {
    try {
      const list = await getGroupList({ baseUrl: bot.baseUrl, accessToken: bot.accessToken })
      for (const g of list) {
        groupSet.add(String(g.group_id))
      }
    } catch {
      continue
    }
  }

  const groups = [...groupSet]

  if (groups.length === 0) {
    return NextResponse.json(
      { error: 'no_groups_available', error_description: 'OneBot 实例未加入任何 QQ 群' },
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
