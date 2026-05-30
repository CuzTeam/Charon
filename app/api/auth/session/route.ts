/**
 * POST /api/auth/session  — create user session after verification
 * GET  /api/auth/session  — get current user session info
 * DELETE /api/auth/session — logout
 */
import { db } from '@/lib/db'
import { charonUsers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  createUserSession,
  getSessionFromCookies,
  deleteUserSession,
} from '@/lib/session'
import { getClientIp, getQQAvatarUrl as buildAvatarUrl } from '@/lib/utils/oauth'
import { getQQAvatarUrl } from '@/lib/onebot'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  const { user } = session
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      qq_id: user.qqId,
      nickname: user.nickname,
      email: user.email,
      avatar_url: getQQAvatarUrl(user.qqId, 640),
      sex: user.sex,
      age: user.age,
      level: user.level,
      login_days: user.loginDays,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
    },
  })
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') ?? undefined
  const body = await req.json()
  const { qq_id } = body

  if (!qq_id) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const users = await db
    .select()
    .from(charonUsers)
    .where(eq(charonUsers.qqId, qq_id))
    .limit(1)

  const user = users[0]
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  const token = await createUserSession(user.id, { ipAddress: ip, userAgent: ua })

  const cookieStore = await cookies()
  cookieStore.set('charon_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  const token = cookieStore.get('charon_session')?.value
  if (token) {
    await deleteUserSession(token)
    cookieStore.delete('charon_session')
  }
  return NextResponse.json({ ok: true })
}
