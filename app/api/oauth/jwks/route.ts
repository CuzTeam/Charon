import { getJwks } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  const jwks = await getJwks()
  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  })
}
