import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { SearchBar } from '../../src/components/files/SearchBar'

describe('SearchBar', () => {
  it('renders input with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('shows current value', () => {
    render(<SearchBar value="hello" onChange={() => {}} />)
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('hello')
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'foo' } })
    expect(onChange).toHaveBeenCalledWith('foo')
  })

  it('hides clear button when value is empty', () => {
    render(<SearchBar value="" onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows clear button when value is non-empty', () => {
    render(<SearchBar value="x" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('clear button click emits empty string', () => {
    const onChange = vi.fn()
    render(<SearchBar value="x" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
