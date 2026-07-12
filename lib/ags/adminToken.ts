import { OAuth20Api } from '@accelbyte/sdk-iam'
import { createSdk } from './sdk'

let cachedToken: { accessToken: string; expiresAt: number } | null = null

// Confidential client credentials (ACCELBYTE_ADMIN_CLIENT_ID/SECRET) for server-only admin
// calls like the bulk user lookup, which needs an admin-scoped token rather than a player's.
export const getAdminAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.accessToken

  // This AGS deployment rejects client_id/client_secret passed in the body (401 unknown_client)
  // and only accepts them via HTTP Basic Auth — verified live.
  const basicAuth = Buffer.from(`${process.env.ACCELBYTE_ADMIN_CLIENT_ID}:${process.env.ACCELBYTE_ADMIN_CLIENT_SECRET}`).toString('base64')
  const api = OAuth20Api(createSdk(), {
    axiosConfig: { request: { headers: { Authorization: `Basic ${basicAuth}` } } }
  })
  const { data } = await api.postOauthToken_v3({ grant_type: 'client_credentials' })

  cachedToken = {
    accessToken: data.access_token!,
    expiresAt: Date.now() + (data.expires_in! - 60) * 1000
  }
  return cachedToken.accessToken
}
