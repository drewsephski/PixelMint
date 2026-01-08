import { expect, test, vi } from 'vitest'
import middleware from './middleware'

// Mock Clerk middleware
vi.mock('@clerk/nextjs/server', () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => vi.fn().mockReturnValue(true), // Mock all routes as public for simple test
}))

test('Middleware is defined', () => {
  expect(middleware).toBeDefined()
})
