import { generateKeyPair, exportSPKI, exportPKCS8, importSPKI, importPKCS8, SignJWT, jwtVerify, exportJWK } from 'jose'
import { db } from '@/lib/db'
import { charonJwks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

export async function getOrCreateActiveKey() {
  const existing = await db
    .select()
    .from(charonJwks)
    .where(eq(charonJwks.isActive, true))
    .limit(1)

  if (existing.length > 0) return existing[0]

  // Generate a new RSA key pair
  const { publicKey, privateKey } = await generateKeyPair('RS256', { modulusLength: 2048 })
  const publicPem = await exportSPKI(publicKey)
  const privatePem = await exportPKCS8(privateKey)

  const id = crypto.randomUUID()
  await db.insert(charonJwks).values({
    id,
    publicKey: publicPem,
    privateKey: privatePem,
    algorithm: 'RS256',
    isActive: true,
  })
  return { id, publicKey: publicPem, privateKey: privatePem, algorithm: 'RS256', isActive: true }
}

export async function getJwks() {
  const keys = await db
    .select()
    .from(charonJwks)
    .where(eq(charonJwks.isActive, true))

  const jwks = await Promise.all(
    keys.map(async (k) => {
      const pub = await importSPKI(k.publicKey, 'RS256')
      const jwk = await exportJWK(pub)
      return { ...jwk, use: 'sig', alg: 'RS256', kid: k.id }
    }),
  )
  return { keys: jwks }
}

export async function signJwt(
  payload: Record<string, unknown>,
  expiresIn: number,
): Promise<string> {
  const keyRecord = await getOrCreateActiveKey()
  const privateKey = await importPKCS8(keyRecord.privateKey, 'RS256')

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: keyRecord.id })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(privateKey)
}

export async function verifyJwt(token: string) {
  const keys = await db
    .select()
    .from(charonJwks)
    .where(eq(charonJwks.isActive, true))

  for (const k of keys) {
    try {
      const publicKey = await importSPKI(k.publicKey, 'RS256')
      const { payload } = await jwtVerify(token, publicKey)
      return payload
    } catch {
      // try next key
    }
  }
  throw new Error('Invalid token')
}

export function getIssuer(): string {
  const base =
    process.env.CHARON_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL || 'http://localhost:3000')
  return base
}
