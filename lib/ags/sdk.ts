import { AccelByte } from '@accelbyte/sdk'

export const createSdk = (accessToken?: string) => {
  const sdk = AccelByte.SDK({
    coreConfig: {
      baseURL: process.env.ACCELBYTE_BASE_URL!,
      namespace: process.env.ACCELBYTE_NAMESPACE!,
      clientId: process.env.ACCELBYTE_CLIENT_ID!,
      redirectURI: process.env.ACCELBYTE_BASE_URL!,
      useSchemaValidation: false
    }
  })
  if (accessToken) {
    sdk.setToken({ accessToken })
  }
  return sdk
}
