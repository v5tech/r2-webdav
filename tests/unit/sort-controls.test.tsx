import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SortControls } from '../../src/components/files/SortControls'

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0 })
  fireEvent.click(trigger)
}

describe('SortControls', () => {
  it('renders the current key and direction button', () => {
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Sort key' })).toHaveTextContent('Name')
    expect(screen.getByRole('button', { name: /sort direction/i })).toBeInTheDocument()
  })

  it('opens all three sort keys with the current key selected', async () => {
    render(<SortControls sortKey="size" sortDir="asc" onSortChange={() => {}} />)
    openMenu(screen.getByRole('button', { name: 'Sort key' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Sort by name' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Sort by size' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Sort by modified' })).toBeInTheDocument()
  })

  it('selecting another key calls onSortChange with same dir', async () => {
    const onSortChange = vi.fn()
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={onSortChange} />)
    openMenu(screen.getByRole('button', { name: 'Sort key' }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'Sort by size' }))
    expect(onSortChange).toHaveBeenCalledWith('size', 'asc')
  })

  it('clicking direction button flips dir and keeps key', () => {
    const onSortChange = vi.fn()
    render(<SortControls sortKey="name" sortDir="asc" onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: /sort direction/i }))
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc')
  })

  it('direction button shows desc state when dir=desc', () => {
    render(<SortControls sortKey="name" sortDir="desc" onSortChange={() => {}} />)
    expect(screen.getByRole('button', { name: /sort direction descending/i })).toBeInTheDocument()
  })
})
