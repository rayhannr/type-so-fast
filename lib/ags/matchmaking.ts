export interface MatchTicket {
  matchTicketID: string
  queueTime: number
}

export interface MatchTicketStatus {
  matchFound: boolean
  sessionID: string
  isActive?: boolean | null
}
