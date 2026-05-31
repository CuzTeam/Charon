import { db } from '@/lib/db'
import { charonSettings } from '@/lib/db/schema'
import { NextResponse } from 'next/server'

const PUBLIC_KEYS = ['system_name', 'system_icon', 'system_logo_url']

export async function GET() {
  const rows = await db.select().from(charonSettings)
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (PUBLIC_KEYS.includes(row.key)) {
      settings[row.key] = row.value
    }
  }
  return NextResponse.json(settings)
}
