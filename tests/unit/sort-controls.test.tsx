import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SortControls } from '../../src/components/files/SortControls'

describe('SortControls', () => {
  it('renders 3 sort key radios + direction button', () => {
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Sort by name' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sort by size' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sort by modified' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /sort direction/i }),
    ).toBeInTheDocument()
  })

  it('marks current sortKey as pressed', () => {
    render(<SortControls sortKey="size" sortDir="asc" onSortChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Sort by size' })).toHaveAttribute(
      'data-state',
      'on',
    )
  })

  it('clicking another key calls onSortChange with same dir', () => {
    const onSortChange = vi.fn()
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Sort by size' }))
    expect(onSortChange).toHaveBeenCalledWith('size', 'asc')
  })

  it('clicking direction button flips dir, keeps key', () => {
    const onSortChange = vi.fn()
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: /sort direction/i }))
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc')
  })

  it('direction button shows desc state when dir=desc', () => {
    render(<SortControls sortKey="name" sortDir="desc" onSortChange={() => {}} />)
    expect(
      screen.getByRole('button', { name: /sort direction descending/i }),
    ).toBeInTheDocument()
  })
})
