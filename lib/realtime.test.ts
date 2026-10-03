import { describe, expect, it } from 'vitest'
import { parseLobbyMessage } from './realtime'

describe('parseLobbyMessage', () => {
  it('unwraps the JSON a freeform notification carries, colons and all', () => {
    const raw = [
      'type: messageNotif',
      'id: 1cadd3988e304c0cbdb99cd42000f0e5',
      'from: system',
      'topic: typesofast',
      'payload: {"event":"room:progress","userId":"abc","wpm":72,"sentAt":1791001292061}',
      'sentAt: 2026-10-03T04:20:07Z'
    ].join('\n')

    expect(parseLobbyMessage(raw)).toEqual({ event: 'room:progress', userId: 'abc', wpm: 72, sentAt: 1791001292061 })
  })

  it('maps userStatusNotif to presence:changed', () => {
    const raw = 'type: userStatusNotif\nuserID: abc\navailability: online\nactivity: \nlastSeenAt: 2026-10-03T04:20:07Z'

    expect(parseLobbyMessage(raw)).toEqual({ event: 'presence:changed', userId: 'abc', availability: 'online' })
  })

  it('tolerates CRLF line endings', () => {
    const raw = 'type: messageNotif\r\npayload: {"event":"invite:new"}\r\n'

    expect(parseLobbyMessage(raw)).toEqual({ event: 'invite:new' })
  })

  it('ignores frames the app has no use for', () => {
    expect(parseLobbyMessage('type: connectNotif\nlobbySessionID: 94f4\nsequenceNumber: 1')).toBeNull()
  })

  it('ignores a notification whose payload is not an event', () => {
    expect(parseLobbyMessage('type: messageNotif\npayload: not json')).toBeNull()
    expect(parseLobbyMessage('type: messageNotif\npayload: {"wpm":1}')).toBeNull()
    expect(parseLobbyMessage('type: messageNotif')).toBeNull()
  })
})
