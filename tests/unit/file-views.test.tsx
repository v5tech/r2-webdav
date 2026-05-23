import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { FileGrid } from '../../src/components/files/FileGrid'
import { FileList } from '../../src/components/files/FileList'
import { ViewToggle } from '../../src/components/files/ViewToggle'
import type { FileItem } from '../../src/lib/types'

const items: FileItem[] = [
  { key: 'foo.txt', size: 42, uploaded: '', httpMetadata: { contentType: 'text/plain' } },
  { key: 'bar.png', size: 1024, uploaded: '', httpMetadata: { contentType: 'image/png' } },
]

const renderItem = (item: FileItem) => (
  <div key={item.key} data-testid={`item-${item.key}`}>
    {item.key}
  </div>
)

describe('FileGrid', () => {
  it('renders all items via renderItem', () => {
    render(<FileGrid items={items} renderItem={renderItem} />)
    expect(screen.getByTestId('item-foo.txt')).toBeInTheDocument()
    expect(screen.getByTestId('item-bar.png')).toBeInTheDocument()
  })

  it('renders nothing for empty items array', () => {
    const { container } = render(<FileGrid items={[]} renderItem={renderItem} />)
    expect(container.querySelector('[data-testid^="item-"]')).toBeNull()
  })
})

describe('FileList', () => {
  it('renders all items via renderItem', () => {
    render(<FileList items={items} renderItem={renderItem} />)
    expect(screen.getByTestId('item-foo.txt')).toBeInTheDocument()
    expect(screen.getByTestId('item-bar.png')).toBeInTheDocument()
  })

  it('renders nothing for empty items array', () => {
    const { container } = render(<FileList items={[]} renderItem={renderItem} />)
    expect(container.querySelector('[data-testid^="item-"]')).toBeNull()
  })
})

describe('ViewToggle', () => {
  it('renders Grid + List radio items', () => {
    render(<ViewToggle view="grid" onViewChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Grid view' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'List view' })).toBeInTheDocument()
  })

  it('clicking List view calls onViewChange("list")', () => {
    const onViewChange = vi.fn()
    render(<ViewToggle view="grid" onViewChange={onViewChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'List view' }))
    expect(onViewChange).toHaveBeenCalledWith('list')
  })

  it('clicking Grid view calls onViewChange("grid")', () => {
    const onViewChange = vi.fn()
    render(<ViewToggle view="list" onViewChange={onViewChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Grid view' }))
    expect(onViewChange).toHaveBeenCalledWith('grid')
  })

  it('marks current view as pressed via data-state', () => {
    render(<ViewToggle view="list" onViewChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'List view' })).toHaveAttribute('data-state', 'on')
    expect(screen.getByRole('radio', { name: 'Grid view' })).toHaveAttribute('data-state', 'off')
  })
})
