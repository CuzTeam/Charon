import { db } from '@/lib/db'
import {
  charonVerificationSessions,
  charonOnebots,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  getGroupMsgHistory,
  getGroupMemberInfo,
  getGroupList,
  extractMessageText,
  getQQAvatarUrl,
} from '@/lib/onebot'
import { getClientIp } from '@/lib/utils/oauth'
import { writeAuditLog, createUserSession } from '@/lib/session'
import { upsertUserByQQ } from '@/lib/user'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const ip = getClientIp(req)

  const body = await req.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const vsRows = await db
    .select()
    .from(charonVerificationSessions)
    .where(
      and(
        eq(charonVerificationSessions.token, token),
        eq(charonVerificationSessions.verified, false),
      ),
    )
    .limit(1)

  const vs = vsRows[0]
  if (!vs) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }
  if (vs.expiresAt < new Date()) {
    return NextResponse.json({ error: 'session_expired' }, { status: 400 })
  }

  const onebots = await db
    .select()
    .from(charonOnebots)
    .where(eq(charonOnebots.isActive, true))

  if (onebots.length === 0) {
    return NextResponse.json({ error: 'no_onebot_available' }, { status: 503 })
  }

  for (const onebot of onebots) {
    const config = { baseUrl: onebot.baseUrl, accessToken: onebot.accessToken }

    let groups: string[]
    try {
      const list = await getGroupList(config)
      groups = list.map((g) => String(g.group_id))
    } catch {
      continue
    }

    if (groups.length === 0) continue

    for (const groupId of groups) {
      try {
        const messages = await getGroupMsgHistory(config, groupId, 30)

        const match = messages.find((msg) => {
          const text = extractMessageText(
            Array.isArray(msg.message) ? msg.message : [],
          )
          return text.includes(vs.code)
        })

        if (!match) continue

        const qqId = String(match.sender.user_id)

        let memberInfo
        try {
          memberInfo = await getGroupMemberInfo(config, groupId, match.sender.user_id)
        } catch {
          memberInfo = null
        }

        const nickname =
          memberInfo?.card || memberInfo?.nickname || match.sender.nickname || qqId
        const sex = memberInfo?.sex || match.sender.sex || 'unknown'
        const age = memberInfo?.age || match.sender.age || 0

        const userId = await upsertUserByQQ({ qqId, nickname, sex, age })

        await db
          .update(charonVerificationSessions)
          .set({ verified: true, qqId })
          .where(eq(charonVerificationSessions.id, vs.id))

        const sessionToken = await createUserSession(userId, {
          ipAddress: ip,
          userAgent: req.headers.get('user-agent') ?? undefined,
        })

        const cookieStore = await cookies()
        cookieStore.set('charon_session', sessionToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })

        await writeAuditLog({
          action: 'user.dashboard_login',
          actorType: 'user',
          actorId: userId,
          ipAddress: ip,
          metadata: { qqId, groupId, onebotId: onebot.id },
        })

        const avatarUrl = getQQAvatarUrl(qqId, 640)
        const email = `${qqId}@qq.com`

        return NextResponse.json({
          verified: true,
          user: {
            id: userId,
            qq_id: qqId,
            nickname,
            avatar_url: avatarUrl,
            email,
          },
        })
      } catch {
        continue
      }
    }
  }

  return NextResponse.json({ verified: false })
}
