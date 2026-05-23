import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { Sidebar } from '../../src/components/layout/Sidebar'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('renders Files link pointing to /files', () => {
    renderSidebar()
    const link = screen.getByRole('link', { name: /files/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/files')
  })

  it('renders Trash link pointing to /trash', () => {
    renderSidebar()
    const link = screen.getByRole('link', { name: /trash|回收站/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/trash')
  })
})
