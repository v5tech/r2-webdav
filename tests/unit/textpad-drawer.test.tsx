import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TextPadDrawer } from '../../src/components/textpad/TextPadDrawer'

describe('TextPadDrawer', () => {
  it('does not render form when open is false', () => {
    render(<TextPadDrawer open={false} onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.queryByTestId('textpad-name')).toBeNull()
    expect(screen.queryByTestId('textpad-body')).toBeNull()
  })

  it('renders filename input and body textarea when open', () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.getByTestId('textpad-name')).toBeInTheDocument()
    expect(screen.getByTestId('textpad-body')).toBeInTheDocument()
  })

  it('defaults filename to note.txt', () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.getByTestId('textpad-name')).toHaveValue('note.txt')
  })

  it('disables Save when body is empty', () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.getByTestId('textpad-save')).toBeDisabled()
  })

  it('calls onSave with a text/plain File for .txt then closes', () => {
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    render(<TextPadDrawer open onOpenChange={onOpenChange} cwd="folder/" onSave={onSave} />)
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: 'hello world' } })
    fireEvent.click(screen.getByTestId('textpad-save'))
    expect(onSave).toHaveBeenCalledTimes(1)
    const file = onSave.mock.calls[0][0] as File
    expect(file.name).toBe('note.txt')
    expect(file.type).toBe('text/plain')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('uses text/markdown MIME for .md filename', () => {
    const onSave = vi.fn()
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={onSave} />)
    fireEvent.change(screen.getByTestId('textpad-name'), { target: { value: 'readme.md' } })
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: '# title' } })
    fireEvent.click(screen.getByTestId('textpad-save'))
    const file = onSave.mock.calls[0][0] as File
    expect(file.name).toBe('readme.md')
    expect(file.type).toBe('text/markdown')
  })

  it('preserves special chars (lt/gt/amp/quot/apos/tab/newline) byte-for-byte', async () => {
    const onSave = vi.fn()
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={onSave} />)
    const tricky = 'a<b>\t&\'"\nLine 2 中文'
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: tricky } })
    fireEvent.click(screen.getByTestId('textpad-save'))
    const file = onSave.mock.calls[0][0] as File
    const text = await file.text()
    expect(text).toBe(tricky)
  })
})
