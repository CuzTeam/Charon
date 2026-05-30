import { db } from '@/lib/db'
import { charonAccessTokens, charonUsers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { NextResponse } from 'next/server'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: Request) {
  const headers = corsHeaders()

  let body: Record<string, string> = {}
  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    body = await req.json()
  } else {
    const form = await req.formData()
    body = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, v.toString()]))
  }

  const token = body.token

  if (!token) {
    return NextResponse.json(
      { active: false },
      { status: 200, headers },
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
    return NextResponse.json({ active: false }, { headers })
  }

  return NextResponse.json(
    {
      active: true,
      sub: row.user.id,
      username: row.user.nickname,
      scope: (row.at.scopes as string[]).join(' '),
      client_id: row.at.clientId,
      token_type: 'Bearer',
      exp: Math.floor(row.at.expiresAt.getTime() / 1000),
      iat: Math.floor(row.at.createdAt.getTime() / 1000),
    },
    { headers },
  )
}
