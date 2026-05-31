import { db } from '@/lib/db'
import { charonAccessTokens, charonUsers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getQQAvatarUrl } from '@/lib/onebot'
import { corsHeadersForOrigin } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: await corsHeadersForOrigin(req) })
}

async function handleUserinfo(req: Request) {
  const headers = await corsHeadersForOrigin(req)
  headers['Cache-Control'] = 'no-store'
  let token = ''

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const url = new URL(req.url)
    token = url.searchParams.get('access_token') ?? ''
  }

  if (!token) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'Missing bearer token' },
      { status: 401, headers },
    )
  }

  const rows = await db
    .select({ at: charonAccessTokens, user: charonUsers })
    .from(charonAccessTokens)
    .innerJoin(charonUsers, eq(charonAccessTokens.userId, charonUsers.id))
    .where(and(eq(charonAccessTokens.token, token), eq(charonAccessTokens.revoked, false)))
    .limit(1)

  const row = rows[0]
  if (!row || row.at.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'Token expired or revoked' },
      { status: 401, headers },
    )
  }

  const { user } = row
  const scopes = row.at.scopes as string[]

  const claims: Record<string, unknown> = {
    sub: user.id,
    id: user.id,
  }

  if (scopes.includes('email')) {
    claims.email = user.email
    claims.email_verified = true
  }

  if (scopes.includes('profile')) {
    claims.name = user.nickname
    claims.nickname = user.nickname
    claims.preferred_username = user.nickname
    claims.picture = getQQAvatarUrl(user.qqId, 640)
    claims.gender = user.sex
    claims.updated_at = Math.floor((user.updatedAt?.getTime() ?? Date.now()) / 1000)
    claims.level = user.level
    claims.login_days = user.loginDays
    claims.created_at = Math.floor((user.createdAt?.getTime() ?? Date.now()) / 1000)
    claims.last_login_at = user.lastLoginAt
      ? Math.floor(user.lastLoginAt.getTime() / 1000)
      : null
  }

  if (scopes.includes('qq')) {
    claims.qq_id = user.qqId
    claims.profile = `${process.env.NEXTAUTH_URL ?? ''}/profile/${user.qqId}`
  }

  return NextResponse.json(claims, { headers })
}

export async function GET(req: Request) {
  return handleUserinfo(req)
}

export async function POST(req: Request) {
  return handleUserinfo(req)
}
