// GET /api/user/dino — get leaderboard
// POST /api/user/dino — submit score
import { db } from '@/lib/db'
import { charonDinoScores, charonUsers } from '@/lib/db/schema'
import { getSessionFromCookies } from '@/lib/session'
import { desc, eq, max, sql } from 'drizzle-orm'
import { maskQQId } from '@/lib/utils/oauth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  // Top 20 scores with masked QQ IDs (best score per user)
  const rows = await db
    .select({
      userId: charonDinoScores.userId,
      score: max(charonDinoScores.score),
      qqId: charonUsers.qqId,
      nickname: charonUsers.nickname,
    })
    .from(charonDinoScores)
    .innerJoin(charonUsers, eq(charonDinoScores.userId, charonUsers.id))
    .groupBy(charonDinoScores.userId, charonUsers.qqId, charonUsers.nickname)
    .orderBy(desc(max(charonDinoScores.score)))
    .limit(20)

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    score: r.score,
    masked_qq: maskQQId(r.qqId ?? ''),
    nickname: r.nickname,
    user_id: r.userId,
  }))

  return NextResponse.json(leaderboard)
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { score } = body

  if (typeof score !== 'number' || score < 0 || score > 99999) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  await db.insert(charonDinoScores).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    score,
  })

  return NextResponse.json({ ok: true })
}
