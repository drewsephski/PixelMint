import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Page from './page'

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  SignUp: () => <div data-testid="clerk-signup">Sign Up Component</div>,
}))

test('Sign-up page renders Clerk SignUp component', () => {
  render(<Page />)
  expect(screen.getByTestId('clerk-signup')).toBeInTheDocument()
})
