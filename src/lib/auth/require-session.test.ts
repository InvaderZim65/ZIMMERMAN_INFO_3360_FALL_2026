// src/lib/auth/require-session.test.ts
// Unit tests for getAuthSession server function.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the @tanstack/react-start/server module
vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(() => ({
    headers: { get: () => 'mock-cookie=abc' },
  })),
}))

// Mock the supabase server client
const mockGetSession = vi.fn()

vi.mock('../supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}))

// Mock createServerFn so we can extract the handler directly
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: Function) => fn,
  }),
}))

// Import after mocks are set up
const { getAuthSession } = await import('./require-session')

describe('getAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const result = await getAuthSession()
    expect(result).toBeNull()
  })

  it('returns null when getSession returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Session expired'),
    })

    const result = await getAuthSession()
    expect(result).toBeNull()
  })

  it('returns user object with id, email, and role when session is valid', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'coach@test.hockey',
            app_metadata: { role: 'head_coach' },
          },
        },
      },
      error: null,
    })

    const result = await getAuthSession()
    expect(result).toEqual({
      user: {
        id: 'user-123',
        email: 'coach@test.hockey',
        role: 'head_coach',
      },
    })
  })

  it('defaults role to anonymous when app_metadata has no role', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-456',
            email: 'unknown@test.hockey',
            app_metadata: {},
          },
        },
      },
      error: null,
    })

    const result = await getAuthSession()
    expect(result).toEqual({
      user: {
        id: 'user-456',
        email: 'unknown@test.hockey',
        role: 'anonymous',
      },
    })
  })

  it('defaults email to empty string when email is undefined', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-789',
            email: undefined,
            app_metadata: { role: 'admin' },
          },
        },
      },
      error: null,
    })

    const result = await getAuthSession()
    expect(result).toEqual({
      user: {
        id: 'user-789',
        email: '',
        role: 'admin',
      },
    })
  })
})
