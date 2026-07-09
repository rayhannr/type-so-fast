import axios from 'axios'

// AGS/Pusher calls throw axios errors carrying the real upstream status/body — surface that
// as-is instead of masking it behind a generic message, so a caller sees the actual AGS error
// (e.g. rate limit, validation, permission) rather than an opaque 500.
export const errorResponse = (err: unknown, context: string): Response => {
  console.error(`[${context}] failed:`, err)
  if (axios.isAxiosError(err) && err.response) {
    return Response.json(err.response.data, { status: err.response.status })
  }
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
