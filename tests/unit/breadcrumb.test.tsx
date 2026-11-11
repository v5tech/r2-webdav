import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { Breadcrumb } from '../../src/components/files/Breadcrumb'

describe('Breadcrumb', () => {
  it('shows only All files for empty cwd', () => {
    render(<Breadcrumb cwd="" onCwdChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'All files' })).toBeInTheDocument()
    expect(screen.queryByText('foo')).toBeNull()
  })

  it('renders segments with trailing slash cwd', () => {
    render(<Breadcrumb cwd="foo/bar/" onCwdChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'All files' })).toBeInTheDocument()
    expect(screen.getByText('foo')).toBeInTheDocument()
    expect(screen.getByText('bar')).toBeInTheDocument()
  })

  it('last segment is not a button (current location)', () => {
    render(<Breadcrumb cwd="foo/bar/" onCwdChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'bar' })).toBeNull()
  })

  it('intermediate segments are buttons', () => {
    render(<Breadcrumb cwd="foo/bar/" onCwdChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'foo' })).toBeInTheDocument()
  })

  it('All files click calls onCwdChange("")', () => {
    const onCwdChange = vi.fn()
    render(<Breadcrumb cwd="foo/bar/" onCwdChange={onCwdChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'All files' }))
    expect(onCwdChange).toHaveBeenCalledWith('')
  })

  it('intermediate segment click calls onCwdChange with that prefix', () => {
    const onCwdChange = vi.fn()
    render(<Breadcrumb cwd="foo/bar/baz/" onCwdChange={onCwdChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'foo' }))
    expect(onCwdChange).toHaveBeenCalledWith('foo/')
  })

  it('intermediate deeper segment includes joined prefix', () => {
    const onCwdChange = vi.fn()
    render(<Breadcrumb cwd="foo/bar/baz/" onCwdChange={onCwdChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'bar' }))
    expect(onCwdChange).toHaveBeenCalledWith('foo/bar/')
  })
})
