import { POST } from './route'
import { NextRequest } from 'next/server'
import { expect, test, vi } from 'vitest'

// Mock Fal.ai
vi.mock('@fal-ai/client', () => ({
  fal: {
    subscribe: vi.fn().mockResolvedValue({
      data: {
        images: [{ url: 'https://example.com/image.jpg' }]
      }
    }),
  }
}))

// Mock Clerk Auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: 'user_123' }),
}))

// Hoist mocks
const mocks = vi.hoisted(() => {
  return {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/image.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.co/image.jpg' } })
  }
})

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: mocks.from,
    insert: mocks.insert,
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl
      })
    }
  }
}))

// Mock fetch for image download
global.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
} as Response)

test('POST /api/generate generates, uploads, and saves to DB', async () => {
  const req = new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'test prompt',
      imageSize: 'square_hd',
      numInferenceSteps: 4,
    }),
  })

  const response = await POST(req)
  await response.json()

  expect(response.status).toBe(200)
  // Check that Supabase upload was called (implicitly via flow)
  // Check that DB insert was called
  expect(mocks.from).toHaveBeenCalledWith('generations')
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
    user_id: 'user_123',
    prompt: 'test prompt',
  }))
})