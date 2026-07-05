import { AccelByte } from '@accelbyte/sdk'

const baseURL = import.meta.env.VITE_ACCELBYTE_BASE_URL
const namespace = import.meta.env.VITE_ACCELBYTE_NAMESPACE
const clientId = import.meta.env.VITE_ACCELBYTE_CLIENT_ID

export const sdk = AccelByte.SDK({
  coreConfig: {
    baseURL,
    namespace,
    clientId,
    redirectURI: window.location.origin,
  },
})
