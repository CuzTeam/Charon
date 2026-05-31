import { db } from '@/lib/db'
import { charonSettings } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

const ALLOWED_KEYS = ['system_name', 'system_icon', 'system_logo_url']

export async function GET() {
  try {
    const session = await getAdminSessionFromCookies()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db.select().from(charonSettings)
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (ALLOWED_KEYS.includes(row.key)) {
      settings[row.key] = row.value
    }
  }
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSessionFromCookies()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) continue
    if (typeof value !== 'string') continue

    await db
      .insert(charonSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: charonSettings.key,
        set: { value, updatedAt: new Date() },
      })
  }

  const rows = await db.select().from(charonSettings)
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (ALLOWED_KEYS.includes(row.key)) {
      settings[row.key] = row.value
    }
  }
  return NextResponse.json(settings)
}
