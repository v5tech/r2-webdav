import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ViewToggle } from '../../src/components/files/ViewToggle'

describe('ViewToggle', () => {
  it('uses the prototype dimensions and accent for the selected view', () => {
    render(<ViewToggle view="list" onViewChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveClass(
      'md:h-[30px]',
      'data-[state=on]:bg-primary/10',
      'data-[state=on]:text-primary',
    )
  })

  it('calls onViewChange when another view is selected', () => {
    const onViewChange = vi.fn()
    render(<ViewToggle view="list" onViewChange={onViewChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Grid view' }))
    expect(onViewChange).toHaveBeenCalledWith('grid')
  })
})
