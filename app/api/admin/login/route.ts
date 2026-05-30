/**
 * POST /api/admin/login — Admin login
 * DELETE /api/admin/login — Admin logout
 */
import { createAdminSession, deleteAdminSession, getAdminSessionFromCookies } from '@/lib/session'
import { checkRateLimit, getClientIp } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`admin_login:${ip}`, 5, 60000)) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', error_description: 'Too many login attempts. Please wait.' },
      { status: 429 },
    )
  }
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

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createAdminSession({ ipAddress: ip, userAgent: ua })
  const cookieStore = await cookies()
  const isDev = process.env.NODE_ENV === 'development'
  cookieStore.set('charon_admin_session', token, {
    httpOnly: true,
    secure: true,
    // 'strict' blocks the cookie on cross-site iframes (v0 preview) and on
    // /api/* routes when path is limited to /admin. Use 'none' in dev so the
    // preview iframe keeps the session, 'lax' in production.
    sameSite: isDev ? 'none' : 'lax',
    maxAge: 60 * 60 * 8,
    path: '/', // must be '/' so /api/admin/* routes receive the cookie
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
