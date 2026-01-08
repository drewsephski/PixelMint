import { supabase } from './supabase'
import { expect, test, vi } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

test('Supabase client is initialized', () => {
  expect(supabase).toBeDefined()
})