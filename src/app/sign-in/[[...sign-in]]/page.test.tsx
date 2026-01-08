import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Page from './page'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  SignIn: () => <div data-testid="clerk-signin">Sign In Component</div>,
}))

test('Sign-in page renders Clerk SignIn component', () => {
  render(<Page />)
  expect(screen.getByTestId('clerk-signin')).toBeInTheDocument()
})
