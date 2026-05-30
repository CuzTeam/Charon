import { db } from '@/lib/db'
import { charonOnebots } from '@/lib/db/schema'
import { getAdminSessionFromCookies } from '@/lib/session'
import { getGroupList } from '@/lib/onebot'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getAdminSessionFromCookies()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const onebots = await db.select().from(charonOnebots).where(eq(charonOnebots.isActive, true))

  const results: { groupId: string; groupName: string; onebotId: string; onebotName: string }[] = []

  for (const ob of onebots) {
    try {
      const groups = await getGroupList({ baseUrl: ob.baseUrl, accessToken: ob.accessToken })
      for (const g of groups) {
        results.push({
          groupId: String(g.group_id),
          groupName: g.group_name,
          onebotId: ob.id,
          onebotName: ob.name,
        })
      }
    } catch { /* skip unreachable onebots */ }
  }

  return NextResponse.json(results)
}
