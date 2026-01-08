import { render, screen } from '@testing-library/react'
import Page from './page'
import { expect, test } from 'vitest'

test('Home page renders generation form', () => {
  render(<Page />)
  
  // Check for Prompt Input
  expect(screen.getByRole('textbox', { name: /prompt/i })).toBeInTheDocument()
  
  // Check for Style Selector (Select component uses specific role structure, simplifying check for label or placeholder)
  expect(screen.getByText(/style/i)).toBeInTheDocument()
  
  // Check for Aspect Ratio Selector
  expect(screen.getByText(/aspect ratio/i)).toBeInTheDocument()
  
  // Check for Generate Button
  expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
})
