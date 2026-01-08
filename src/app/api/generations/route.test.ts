import { GET } from './route'
import { NextRequest } from 'next/server'
import { expect, test, vi } from 'vitest'

// Mock Clerk Auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: 'user_123' }),
}))

// Mock Supabase
const mockSupabaseQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'gen-1',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'user_123',
        prompt: 'test prompt',
        style: 'photorealistic',
        aspect_ratio: 'square_hd',
        image_url: 'https://example.com/image1.jpg',
        storage_path: 'user_123/123456.jpg'
      }
    ],
    error: null
  }),
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockSupabaseQuery),
  }
}))

test('GET /api/generations fetches user generations', async () => {
  const req = new NextRequest('http://localhost/api/generations')

  const response = await GET()
  const result = await response.json()

  expect(response.status).toBe(200)
  expect(result.success).toBe(true)
  expect(result.data.generations).toHaveLength(1)
  expect(result.data.generations[0].prompt).toBe('test prompt')
})