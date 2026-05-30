import { db } from '@/lib/db'
import { charonAccessTokens, charonRefreshTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

  const { token, token_type_hint } = body

  if (!token) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers })
  }

  // Try both tables unless hint is given
  if (!token_type_hint || token_type_hint === 'access_token') {
    await db
      .update(charonAccessTokens)
      .set({ revoked: true })
      .where(eq(charonAccessTokens.token, token))
  }
  if (!token_type_hint || token_type_hint === 'refresh_token') {
    await db
      .update(charonRefreshTokens)
      .set({ revoked: true })
      .where(eq(charonRefreshTokens.token, token))
  }

  return new Response(null, { status: 200, headers })
}
