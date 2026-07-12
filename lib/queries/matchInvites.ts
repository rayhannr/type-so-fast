import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { PvpSession } from '@/lib/ags/session'
import { authHeaders, AgsSession } from './shared'

export const useSendInviteMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (inviteeUserId: string) => axios.post('/api/match-invites', { inviteeUserId }, { headers: authHeaders(session!) })
  })

export const useAcceptInviteMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (inviterUserId: string) =>
      axios.post<PvpSession>('/api/match-invites/accept', { inviterUserId }, { headers: authHeaders(session!) }).then(res => res.data)
  })

export const useDeclineInviteMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (inviterUserId: string) => axios.post('/api/match-invites/decline', { inviterUserId }, { headers: authHeaders(session!) })
  })
