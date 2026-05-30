import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  if (pathname.startsWith('/admin')) {
    const isPublic =
      pathname === '/admin' ||
      pathname === '/admin/' ||
      pathname === '/admin/login'

    if (!isPublic) {
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
