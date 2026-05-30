import { getIssuer } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET() {
  const issuer = getIssuer()

  const config = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    userinfo_endpoint: `${issuer}/api/oauth/userinfo`,
    jwks_uri: `${issuer}/api/oauth/jwks`,
    registration_endpoint: undefined,
    scopes_supported: ['openid', 'profile', 'email', 'qq', 'offline_access'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    acr_values_supported: [],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic',
    ],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'nonce',
      'email',
      'name',
      'nickname',
      'preferred_username',
      'picture',
      'profile',
      'website',
      'gender',
      'birthdate',
      'phone_number',
      'updated_at',
      'qq_id',
    ],
    code_challenge_methods_supported: ['S256', 'plain'],
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    introspection_endpoint: `${issuer}/api/oauth/introspect`,
    end_session_endpoint: `${issuer}/api/oauth/logout`,
    check_session_iframe: undefined,
    frontchannel_logout_supported: false,
    backchannel_logout_supported: false,
    claims_parameter_supported: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: false,
    require_request_uri_registration: false,
    op_policy_uri: undefined,
    op_tos_uri: undefined,
  }

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
