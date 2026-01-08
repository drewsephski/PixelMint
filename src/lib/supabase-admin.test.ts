import { supabaseAdmin } from './supabase-admin'
import { expect, test, vi } from 'vitest'

vi.mock('./supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}))

test('Supabase Admin client is defined', () => {
  expect(supabaseAdmin).toBeDefined()
})
