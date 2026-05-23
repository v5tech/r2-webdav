import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SelectionToolbar } from '../../src/components/files/SelectionToolbar'

describe('SelectionToolbar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <SelectionToolbar
        selectedCount={0}
        onClear={() => {}}
        onDelete={() => {}}
        onDownload={() => {}}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders count text and action buttons when count > 0', () => {
    render(
      <SelectionToolbar
        selectedCount={3}
        onClear={() => {}}
        onDelete={() => {}}
        onDownload={() => {}}
      />,
    )
    expect(screen.getByText(/3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument()
  })

  it('clicking Clear calls onClear', () => {
    const onClear = vi.fn()
    render(
      <SelectionToolbar
        selectedCount={1}
        onClear={onClear}
        onDelete={() => {}}
        onDownload={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('clicking Delete calls onDelete', () => {
    const onDelete = vi.fn()
    render(
      <SelectionToolbar
        selectedCount={1}
        onClear={() => {}}
        onDelete={onDelete}
        onDownload={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(onDelete).toHaveBeenCalled()
  })

  it('clicking Download calls onDownload', () => {
    const onDownload = vi.fn()
    render(
      <SelectionToolbar
        selectedCount={1}
        onClear={() => {}}
        onDelete={() => {}}
        onDownload={onDownload}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^download$/i }))
    expect(onDownload).toHaveBeenCalled()
  })

  it('disables action buttons when busy', () => {
    render(
      <SelectionToolbar
        selectedCount={2}
        onClear={() => {}}
        onDelete={() => {}}
        onDownload={() => {}}
        busy
      />,
    )
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^download$/i })).toBeDisabled()
  })
})
