import { render, screen } from '@testing-library/react'
import Page from './page'
import { expect, test } from 'vitest'

test('Home page renders a Generate button', () => {
  render(<Page />)
  const button = screen.getByRole('button', { name: /generate/i })
  expect(button).toBeInTheDocument()
})
