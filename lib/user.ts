import { db } from '@/lib/db'
import { charonUsers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getQQAvatarUrl } from '@/lib/onebot'
import crypto from 'crypto'

interface UpsertUserInfo {
  qqId: string
  nickname: string
  sex: string
  age: number
}

export async function upsertUserByQQ(info: UpsertUserInfo): Promise<string> {
  const avatarUrl = getQQAvatarUrl(info.qqId, 640)
  const email = `${info.qqId}@qq.com`

  const existingUsers = await db
    .select()
    .from(charonUsers)
    .where(eq(charonUsers.qqId, info.qqId))
    .limit(1)

  if (existingUsers.length > 0) {
    const existing = existingUsers[0]
    const userId = existing.id
    const lastLogin = existing.lastLoginAt
    const isNewDay =
      !lastLogin ||
      lastLogin.toDateString() !== new Date().toDateString()

    await db
      .update(charonUsers)
      .set({
        nickname: info.nickname,
        avatarUrl,
        sex: info.sex,
        age: info.age,
        lastLoginAt: new Date(),
        loginDays: isNewDay ? (existing.loginDays ?? 0) + 1 : existing.loginDays ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(charonUsers.id, userId))
    return userId
  }

  const userId = crypto.randomUUID()
  await db.insert(charonUsers).values({
    id: userId,
    qqId: info.qqId,
    email,
    nickname: info.nickname,
    avatarUrl,
    sex: info.sex,
    age: info.age,
    loginDays: 1,
    lastLoginAt: new Date(),
  })
  return userId
}
