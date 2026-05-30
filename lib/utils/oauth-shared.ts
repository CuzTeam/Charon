export function validateRedirectUri(uri: string, registered: string[]): boolean {
  return registered.includes(uri)
}

export function parseScopes(scopeStr: string): string[] {
  return scopeStr
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function filterScopes(requested: string[], allowed: string[]): string[] {
  return requested.filter((s) => allowed.includes(s))
}

export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: '确认您的身份',
  profile: '读取您的个人资料（昵称、头像）',
  email: '读取您的邮箱地址',
  qq: '读取您的 QQ 号',
  offline_access: '在您离线时访问您的数据',
  'charon:full': '完整访问您的 Charon 账户',
}

export function maskQQId(qqId: string): string {
  if (qqId.length <= 4) return qqId
  return `${qqId.slice(0, 2)}${'*'.repeat(qqId.length - 4)}${qqId.slice(-2)}`
}

export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return ''
  if (secret.length <= 8) return '****'
  return `${secret.slice(0, 4)}${'*'.repeat(secret.length - 8)}${secret.slice(-4)}`
}
