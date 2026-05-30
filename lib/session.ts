import { db } from '@/lib/db'
import {
  charonSessions,
  charonAdminSessions,
  charonUsers,
  charonAuditLogs,
} from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 hours

// ─── User Sessions ──────────────────────────────────────────────────────────

export async function createUserSession(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string },
) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await db.insert(charonSessions).values({
    id: crypto.randomUUID(),
    userId,
    token,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt,
  })
  return token
}

export async function getUserFromSession(token: string) {
  if (!token) return null
  const rows = await db
    .select({ session: charonSessions, user: charonUsers })
    .from(charonSessions)
    .innerJoin(charonUsers, eq(charonSessions.userId, charonUsers.id))
    .where(
      and(
        eq(charonSessions.token, token),
        gt(charonSessions.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function deleteUserSession(token: string) {
  await db.delete(charonSessions).where(eq(charonSessions.token, token))
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies()
  const token = cookieStore.get('charon_session')?.value
  if (!token) return null
  return getUserFromSession(token)
}

// ─── Admin Sessions ──────────────────────────────────────────────────────────

export async function createAdminSession(meta: {
  ipAddress?: string
  userAgent?: string
}) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000)
  await db.insert(charonAdminSessions).values({
    id: crypto.randomUUID(),
    token,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt,
  })
  return token
}

export async function verifyAdminSession(token: string) {
  if (!token) return false
  const rows = await db
    .select()
    .from(charonAdminSessions)
    .where(
      and(
        eq(charonAdminSessions.token, token),
        gt(charonAdminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1)
  return rows.length > 0
}

export async function deleteAdminSession(token: string) {
  await db.delete(charonAdminSessions).where(eq(charonAdminSessions.token, token))
}

export async function getAdminSessionFromCookies() {
  const cookieStore = await cookies()
  const token = cookieStore.get('charon_admin_session')?.value
  if (!token) return null
  return verifyAdminSession(token) ? token : null
}

// ─── Audit Logging ───────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  action: string
  actorType?: string
  actorId?: string
  targetType?: string
  targetId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}) {
  await db.insert(charonAuditLogs).values({
    id: crypto.randomUUID(),
    action: entry.action,
    actorType: entry.actorType ?? 'system',
    actorId: entry.actorId,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    metadata: entry.metadata ?? {},
  })
}
