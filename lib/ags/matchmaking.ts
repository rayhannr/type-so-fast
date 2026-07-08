import { Matchmaking } from '@accelbyte/sdk-matchmaking'
import { createSdk } from './sdk'

const MATCH_POOL = 'pvp-quick-match'

export interface MatchTicket {
  matchTicketID: string
  queueTime: number
}

export interface MatchTicketStatus {
  matchFound: boolean
  sessionID: string
  isActive?: boolean | null
}

export const createMatchTicket = async (accessToken: string): Promise<MatchTicket> => {
  const { MatchTicketsApi } = Matchmaking
  const api = MatchTicketsApi(createSdk(accessToken))
  const { data } = await api.createMatchTicket({ matchPool: MATCH_POOL, attributes: {}, latencies: {} })
  return data
}

export const getMatchTicketStatus = async (accessToken: string, ticketId: string): Promise<MatchTicketStatus> => {
  const { MatchTicketsApi } = Matchmaking
  const api = MatchTicketsApi(createSdk(accessToken))
  const { data } = await api.getMatchTicket_ByTicketid(ticketId)
  return data
}

export const cancelMatchTicket = async (accessToken: string, ticketId: string): Promise<void> => {
  const { MatchTicketsApi } = Matchmaking
  const api = MatchTicketsApi(createSdk(accessToken))
  await api.deleteMatchTicket_ByTicketid(ticketId)
}
