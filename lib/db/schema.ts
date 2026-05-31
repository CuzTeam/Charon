import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'

// JWKS key pairs for signing JWTs
export const charonJwks = pgTable('charon_jwks', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  algorithm: text('algorithm').notNull().default('RS256'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

// Users authenticated via QQ
export const charonUsers = pgTable('charon_users', {
  id: text('id').primaryKey(),
  qqId: text('qq_id').notNull().unique(),
  email: text('email').notNull().unique(),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  sex: text('sex'),
  age: integer('age'),
  level: integer('level').default(0),
  loginDays: integer('login_days').default(0),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// User sessions (JWT-backed)
export const charonSessions = pgTable('charon_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => charonUsers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Admin sessions (independent from OIDC)
export const charonAdminSessions = pgTable('charon_admin_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// OneBot V11 HTTP instances
export const charonOnebots = pgTable('charon_onebots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  accessToken: text('access_token'),
  botQq: text('bot_qq'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// OAuth2 clients
export const charonClients = pgTable('charon_clients', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  redirectUris: text('redirect_uris').array().notNull().default([]),
  allowedScopes: text('allowed_scopes').array().notNull().default(['openid', 'profile', 'email']),
  allowedGroups: text('allowed_groups').array().notNull().default([]),
  onebotIds: text('onebot_ids').array().notNull().default([]),
  requirePkce: boolean('require_pkce').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  grantTypes: text('grant_types').array().notNull().default(['authorization_code', 'refresh_token']),
  responseTypes: text('response_types').array().notNull().default(['code']),
  tokenEndpointAuthMethod: text('token_endpoint_auth_method').notNull().default('client_secret_post'),
  accessTokenTtl: integer('access_token_ttl').notNull().default(3600),
  refreshTokenTtl: integer('refresh_token_ttl').notNull().default(2592000),
  idTokenTtl: integer('id_token_ttl').notNull().default(3600),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Authorization codes (OAuth2 authorization_code grant)
export const charonAuthorizationCodes = pgTable('charon_authorization_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  clientId: text('client_id')
    .notNull()
    .references(() => charonClients.clientId, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => charonUsers.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(),
  scopes: text('scopes').array().notNull().default([]),
  codeChallenge: text('code_challenge'),
  codeChallengeMethod: text('code_challenge_method'),
  nonce: text('nonce'),
  state: text('state'),
  used: boolean('used').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Opaque access tokens
export const charonAccessTokens = pgTable('charon_access_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  clientId: text('client_id')
    .notNull()
    .references(() => charonClients.clientId, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => charonUsers.id, { onDelete: 'cascade' }),
  scopes: text('scopes').array().notNull().default([]),
  revoked: boolean('revoked').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Refresh tokens
export const charonRefreshTokens = pgTable('charon_refresh_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  clientId: text('client_id')
    .notNull()
    .references(() => charonClients.clientId, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => charonUsers.id, { onDelete: 'cascade' }),
  scopes: text('scopes').array().notNull().default([]),
  revoked: boolean('revoked').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// User consents per client
export const charonConsents = pgTable(
  'charon_consents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => charonUsers.id, { onDelete: 'cascade' }),
    clientId: text('client_id')
      .notNull()
      .references(() => charonClients.clientId, { onDelete: 'cascade' }),
    scopes: text('scopes').array().notNull().default([]),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [unique().on(t.userId, t.clientId)],
)

// QQ code verification sessions (pre-OAuth)
export const charonVerificationSessions = pgTable('charon_verification_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  code: text('code').notNull(),
  clientId: text('client_id').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  scopes: text('scopes').array().notNull().default([]),
  codeChallenge: text('code_challenge'),
  codeChallengeMethod: text('code_challenge_method'),
  nonce: text('nonce'),
  state: text('state'),
  qqId: text('qq_id'),
  verified: boolean('verified').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Audit log
export const charonAuditLogs = pgTable('charon_audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  actorType: text('actor_type').notNull().default('user'),
  actorId: text('actor_id'),
  targetType: text('target_type'),
  targetId: text('target_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Dino game leaderboard
export const charonDinoScores = pgTable('charon_dino_scores', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => charonUsers.id, { onDelete: 'cascade' }),
  score: integer('score').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CharonUser = typeof charonUsers.$inferSelect
export type CharonClient = typeof charonClients.$inferSelect
export type CharonOnebot = typeof charonOnebots.$inferSelect
export type CharonAuditLog = typeof charonAuditLogs.$inferSelect
export type CharonConsent = typeof charonConsents.$inferSelect
export type CharonDinoScore = typeof charonDinoScores.$inferSelect

// System settings (key-value store)
export const charonSettings = pgTable('charon_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
