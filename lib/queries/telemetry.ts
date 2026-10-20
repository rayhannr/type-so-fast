import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { RaceFinishedEvent } from '@/lib/ags/telemetry'
import { authHeaders, AgsSession } from './shared'

export const useRaceFinishedMutation = (session: AgsSession | null) =>
  useMutation({
    mutationFn: (event: RaceFinishedEvent) =>
      axios.post('/api/telemetry/race-finished', event, { headers: authHeaders(session!) })
  })
