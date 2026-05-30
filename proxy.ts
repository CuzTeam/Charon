import { NextRequest, NextResponse } from 'next/server'

/**
 * Charon middleware
 * - Protects /home, /apps, /dino-games → redirect to /login
 * - Protects /admin/* (except /admin, /admin/login page) → check admin session cookie
 */

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ─── User dashboard protection ─────────────────────────────────────────────
  const userProtected = ['/home', '/apps', '/dino-games']
  if (userProtected.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const session = req.cookies.get('charon_session')?.value
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ─── Admin console protection ──────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Allow the admin login page and admin login API
    const isLoginPage = pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/login'
    const isLoginApi = pathname === '/api/admin/login'
    if (!isLoginPage && !isLoginApi) {
      const adminSession = req.cookies.get('charon_admin_session')?.value
      if (!adminSession) {
        const url = req.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/home/:path*',
    '/apps/:path*',
    '/dino-games/:path*',
    '/admin/:path*',
  ],
}
