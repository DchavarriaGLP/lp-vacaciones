import { describe, it, expect, beforeAll } from 'vitest'
import { encodeSession, decodeSession, type SessionUser } from '@/lib/auth/session'

const user: SessionUser = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'daniel.chavarria',
  role: 'admin',
  employeeId: null,
}

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-at-least-16-chars-long'
})

describe('session HMAC', () => {
  it('codifica y decodifica una sesión válida (round-trip)', async () => {
    const token = await encodeSession(user)
    const decoded = await decodeSession(token)
    expect(decoded).toEqual(user)
  })

  it('rechaza un token con firma manipulada', async () => {
    const token = await encodeSession(user)
    const [payload] = token.split('.')
    const tampered = `${payload}.firmafalsa`
    expect(await decodeSession(tampered)).toBeNull()
  })

  it('rechaza un token con payload manipulado', async () => {
    const token = await encodeSession(user)
    const sig = token.split('.')[1]
    const fakePayload = Buffer.from(JSON.stringify({ ...user, id: 'x' })).toString('base64')
    expect(await decodeSession(`${fakePayload}.${sig}`)).toBeNull()
  })

  it('rechaza un token mal formado', async () => {
    expect(await decodeSession('no-tiene-punto')).toBeNull()
    expect(await decodeSession('')).toBeNull()
  })
})
