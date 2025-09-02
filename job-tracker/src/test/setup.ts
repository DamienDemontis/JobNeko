import '@testing-library/jest-dom/vitest'
import { beforeEach, vi, expect } from 'vitest'

// Make expect globally available
globalThis.expect = expect

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'

// Mock fetch globally
global.fetch = vi.fn()

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  }))
}))

// Mock Chrome extension APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({})),
      set: vi.fn((items, callback) => callback?.()),
    }
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ url: 'https://example.com/job' }])),
  }
} as any

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks()
})
