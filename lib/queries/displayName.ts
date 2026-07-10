import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agsErrorMessage, authHeaders, readLocal, writeLocal, AgsSession } from './shared'

const displayNameKey = (userId: string) => ['displayName', userId] as const

export const useDisplayNameQuery = (session: AgsSession | null) =>
  useQuery({
    queryKey: displayNameKey(session?.userId ?? ''),
    queryFn: async () => {
      const localName = readLocal<string | null>('displayName', null) ?? undefined
      const { data } = await axios.get<{ displayName: string }>('/api/display-name', {
        headers: authHeaders(session!),
        params: localName ? { localName } : undefined,
      })
      writeLocal('displayName', data.displayName)
      return data.displayName
    },
    enabled: !!session,
  })

export const useUpdateDisplayNameMutation = (session: AgsSession | null) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) =>
      axios
        .patch<{ displayName: string }>('/api/display-name', { displayName }, { headers: authHeaders(session!) })
        .then((res) => res.data.displayName),
    onSuccess: (displayName) => {
      writeLocal('displayName', displayName)
      if (session) queryClient.setQueryData(displayNameKey(session.userId), displayName)
    },
  })
}

// AGS IAM update-user error codes:
// https://raw.githubusercontent.com/AccelByte/accelbyte-go-sdk/refs/heads/main/spec/iam.json
// (path /iam/v3/public/namespaces/{namespace}/users/me, patch, x-errorCodes)
const updateDisplayNameErrorMessages: Record<number, string> = {
  10222: 'That name is already taken — try another one.',
  10237: "This account isn't allowed to change its display name.",
  20002: "That name isn't valid — try a different one.",
}

export const updateDisplayNameErrorMessage = (error: unknown): string =>
  agsErrorMessage(error, updateDisplayNameErrorMessages, "Couldn't save your name — try again.")
