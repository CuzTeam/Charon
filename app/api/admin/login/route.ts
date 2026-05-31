import { createAdminSession, deleteAdminSession, getAdminSessionFromCookies } from '@/lib/session'
import { getClientIp } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') ?? undefined
  const body = await req.json()
  const { password } = body

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json(
      { error: 'Admin password not configured. Set the ADMIN_PASSWORD environment variable.' },
      { status: 503 },
    )
  }

  const passwordBuf = Buffer.from(String(password), 'utf8')
  const adminPasswordBuf = Buffer.from(adminPassword, 'utf8')
  if (passwordBuf.length !== adminPasswordBuf.length || !crypto.timingSafeEqual(passwordBuf, adminPasswordBuf)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createAdminSession({ ipAddress: ip, userAgent: ua })
  const cookieStore = await cookies()
  const isDev = process.env.NODE_ENV === 'development'
  cookieStore.set('charon_admin_session', token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'none' : 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  const token = cookieStore.get('charon_admin_session')?.value
  if (token) {
    await deleteAdminSession(token)
    cookieStore.delete({ name: 'charon_admin_session', path: '/' })
  }
  return NextResponse.json({ ok: true })
}
