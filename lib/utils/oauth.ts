import crypto from 'crypto'
import {
  validateRedirectUri,
  parseScopes,
  filterScopes,
  SCOPE_DESCRIPTIONS,
  maskQQId,
  maskSecret,
} from './oauth-shared'
import { db } from '@/lib/db'

export {
  validateRedirectUri,
  parseScopes,
  filterScopes,
  SCOPE_DESCRIPTIONS,
  maskQQId,
  maskSecret,
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)]
  }
  return `CHARON-${code}`
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: string,
): boolean {
  if (method === 'S256') {
    return generateCodeChallenge(verifier) === challenge
  }
  return false
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

const SALT_LENGTH = 16
const KEY_LENGTH = 64

export function hashClientSecret(secret: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  const hash = crypto.scryptSync(secret, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

export function verifyClientSecret(secret: string, stored: string): boolean {
  if (!stored.includes(':')) {
    return crypto.timingSafeEqual(
      Buffer.from(secret, 'utf8'),
      Buffer.from(stored, 'utf8'),
    )
  }
  const [salt, hash] = stored.split(':')
  const verifyHash = crypto.scryptSync(secret, salt, KEY_LENGTH).toString('hex')
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(verifyHash, 'hex'),
  )
}

export async function getAllowedOrigins(): Promise<string[]> {
  const origins = new Set<string>()
  const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL || 'http://localhost:3000'
  try {
    origins.add(new URL(appUrl).origin)
  } catch { /* ignore */ }

  try {
    const { charonClients } = await import('@/lib/db/schema')
    const clients = await db.select({ redirectUris: charonClients.redirectUris }).from(charonClients)
    for (const client of clients) {
      for (const uri of (client.redirectUris as string[])) {
        try { origins.add(new URL(uri).origin) } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }

  return Array.from(origins)
}

export async function corsHeadersForOrigin(req: Request): Promise<Record<string, string>> {
  const origin = req.headers.get('origin')
  const allowed = await getAllowedOrigins()
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  }
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}
