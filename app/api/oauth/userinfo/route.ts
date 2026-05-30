import { db } from '@/lib/db'
import { charonAccessTokens, charonUsers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getQQAvatarUrl } from '@/lib/onebot'
import { NextResponse } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

async function handleUserinfo(req: Request) {
  const headers = corsHeaders()
  const authHeader = req.headers.get('Authorization') ?? ''
  let token = ''

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
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

  // Always include sub
  const claims: Record<string, unknown> = {
    sub: user.id,
  }

  if (scopes.includes('email')) {
    claims.email = user.email
    claims.email_verified = true
  }

  if (scopes.includes('profile')) {
    claims.name = user.nickname
    claims.nickname = user.nickname
    claims.preferred_username = user.nickname
    // Always return fresh avatar
    claims.picture = getQQAvatarUrl(user.qqId, 640)
    claims.profile = `${process.env.NEXTAUTH_URL ?? ''}/profile/${user.qqId}`
    claims.gender = user.sex
    claims.updated_at = Math.floor((user.updatedAt?.getTime() ?? Date.now()) / 1000)
    claims.level = user.level
    claims.login_days = user.loginDays
  }

  if (scopes.includes('qq')) {
    claims.qq_id = user.qqId
  }

  // Extended claims always present for full compatibility
  claims.created_at = Math.floor((user.createdAt?.getTime() ?? Date.now()) / 1000)
  claims.last_login_at = user.lastLoginAt
    ? Math.floor(user.lastLoginAt.getTime() / 1000)
    : null

  return NextResponse.json(claims, { headers })
}

export async function GET(req: Request) {
  return handleUserinfo(req)
}

export async function POST(req: Request) {
  return handleUserinfo(req)
}
