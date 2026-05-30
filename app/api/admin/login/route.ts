/**
 * POST /api/admin/login — Admin login
 * DELETE /api/admin/login — Admin logout
 */
import { createAdminSession, deleteAdminSession, getAdminSessionFromCookies } from '@/lib/session'
import { getClientIp } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await createAdminSession({ ipAddress: ip, userAgent: ua })
  const cookieStore = await cookies()
  cookieStore.set('charon_admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/admin',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  const token = cookieStore.get('charon_admin_session')?.value
  if (token) {
    await deleteAdminSession(token)
    cookieStore.delete('charon_admin_session')
  }
  return NextResponse.json({ ok: true })
}
