import crypto from 'crypto'

/**
 * Generate a random verification code like CHARON-A3F9X2
 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `CHARON-${code}`
}

/**
 * Simple in-memory rate limiter (per token bucket)
 * For server-side request counting — 30 RPM per IP
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

/**
 * PKCE: Generate S256 code verifier and challenge
 */
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
  if (method === 'plain') {
    return verifier === challenge
  }
  return false
}

/**
 * Validate that a redirect_uri matches one of the registered URIs
 * Exact match required per OAuth2 spec
 */
export function validateRedirectUri(uri: string, registered: string[]): boolean {
  return registered.includes(uri)
}

/**
 * Parse scopes from space-separated string
 */
export function parseScopes(scopeStr: string): string[] {
  return scopeStr
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Filter requested scopes to only those allowed by the client
 */
export function filterScopes(requested: string[], allowed: string[]): string[] {
  return requested.filter((s) => allowed.includes(s))
}

/**
 * Standard OIDC scopes definition
 */
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: '确认您的身份',
  profile: '读取您的个人资料（昵称、头像）',
  email: '读取您的邮箱地址',
  qq: '读取您的 QQ 号',
  offline_access: '在您离线时访问您的数据',
  'charon:full': '完整访问您的 Charon 账户',
}

/**
 * Mask QQ number: show first 2 and last 2 digits
 */
export function maskQQId(qqId: string): string {
  if (qqId.length <= 4) return qqId
  return `${qqId.slice(0, 2)}${'*'.repeat(qqId.length - 4)}${qqId.slice(-2)}`
}

/**
 * Get client IP from request headers (Vercel / proxy)
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
