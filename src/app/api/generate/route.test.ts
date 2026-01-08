/**
 * @vitest-environment node
 */
import { POST } from './route'
import { NextRequest } from 'next/server'
import { expect, test, vi } from 'vitest'

vi.mock('@fal-ai/serverless-client', () => ({
  subscribe: vi.fn().mockResolvedValue({
    images: [{ url: 'https://example.com/image.jpg' }]
  }),
}))

test('POST /api/generate returns generated image URL', async () => {
  const req = new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt: 'test prompt',
      imageSize: 'square_hd',
      numInferenceSteps: 4,
    }),
  })

  const response = await POST(req)
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.data.images[0].url).toBe('https://example.com/image.jpg')
})
