import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/lib/i18n'

import { TextPadDrawer } from '../../src/components/textpad/TextPadDrawer'

beforeEach(() => {
  void i18n.changeLanguage('en')
})

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

  it('uses the prototype drawer width and provides a cancel action', () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-[440px]')
    expect(screen.getByRole('button', { name: /^cancel$/i })).toHaveClass('h-10')
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

  it('keeps the drawer open and preserves content when save reports a conflict', () => {
    const onSave = vi.fn(() => true)
    const onOpenChange = vi.fn()
    render(<TextPadDrawer open onOpenChange={onOpenChange} cwd="" onSave={onSave} />)
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: 'draft' } })
    fireEvent.click(screen.getByTestId('textpad-save'))
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByTestId('textpad-body')).toHaveValue('draft')
  })

  it('localizes the text file type label', async () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    expect(screen.getByText('Text', { exact: true })).toBeInTheDocument()
    await act(async () => {
      await i18n.changeLanguage('zh')
    })
    expect(screen.getByText('文本', { exact: true })).toBeInTheDocument()
  })

  it('keeps the unsaved confirmation within the mobile viewport', () => {
    render(<TextPadDrawer open onOpenChange={vi.fn()} cwd="" onSave={vi.fn()} />)
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: 'draft' } })
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.getByRole('alertdialog')).toHaveClass(
      'w-[min(480px,calc(100vw-32px))]',
      'data-[size=default]:max-w-[calc(100vw-32px)]',
    )
  })

  it('asks before discarding unsaved changes', () => {
    const onOpenChange = vi.fn()
    render(<TextPadDrawer open onOpenChange={onOpenChange} cwd="" onSave={vi.fn()} />)
    fireEvent.change(screen.getByTestId('textpad-body'), { target: { value: 'draft' } })
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.getByText(/unsaved changes|未保存的更改/i)).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
