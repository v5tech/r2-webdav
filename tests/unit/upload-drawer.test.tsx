import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { UploadDrawer } from '../../src/components/files/UploadDrawer'
import type { UploadTask } from '../../src/hooks/use-upload-queue'

function task(over: Partial<UploadTask>): UploadTask {
  return {
    id: over.id ?? 'id-1',
    file: over.file ?? new File(['x'], 'a.txt'),
    cwd: over.cwd ?? '',
    status: over.status ?? 'pending',
    loaded: over.loaded ?? 0,
    total: over.total ?? 100,
    error: over.error,
  }
}

describe('UploadDrawer', () => {
  it('renders nothing when tasks empty', () => {
    const { container } = render(
      <UploadDrawer tasks={[]} onClearCompleted={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders heading and tasks when present', () => {
    render(
      <UploadDrawer
        tasks={[task({ id: 't1', file: new File(['x'], 'a.txt') })]}
        onClearCompleted={() => {}}
      />,
    )
    expect(screen.getByText(/uploads/i)).toBeInTheDocument()
    expect(screen.getByText('a.txt')).toBeInTheDocument()
  })

  it('shows status labels per task', () => {
    render(
      <UploadDrawer
        tasks={[
          task({ id: '1', file: new File(['x'], 'p.txt'), status: 'pending' }),
          task({ id: '2', file: new File(['x'], 'u.txt'), status: 'uploading' }),
          task({ id: '3', file: new File(['x'], 'c.txt'), status: 'completed' }),
          task({
            id: '4',
            file: new File(['x'], 'f.txt'),
            status: 'failed',
            error: 'boom',
          }),
        ]}
        onClearCompleted={() => {}}
      />,
    )
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
    expect(screen.getByText(/^done$/i)).toBeInTheDocument()
    expect(screen.getByText(/failed/i)).toBeInTheDocument()
  })

  it('shows progress bar value for uploading task', () => {
    render(
      <UploadDrawer
        tasks={[task({ status: 'uploading', loaded: 25, total: 100 })]}
        onClearCompleted={() => {}}
      />,
    )
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('25')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('Clear completed button calls onClearCompleted', () => {
    const onClearCompleted = vi.fn()
    render(
      <UploadDrawer
        tasks={[task({ status: 'completed' })]}
        onClearCompleted={onClearCompleted}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /clear completed/i }))
    expect(onClearCompleted).toHaveBeenCalled()
  })

  it('shows cancel button only for pending and uploading tasks', () => {
    render(
      <UploadDrawer
        tasks={[
          task({ id: '1', file: new File(['x'], 'p.txt'), status: 'pending' }),
          task({ id: '2', file: new File(['x'], 'u.txt'), status: 'uploading' }),
          task({ id: '3', file: new File(['x'], 'c.txt'), status: 'completed' }),
          task({
            id: '4',
            file: new File(['x'], 'f.txt'),
            status: 'failed',
            error: 'boom',
          }),
          task({ id: '5', file: new File(['x'], 'x.txt'), status: 'cancelled' }),
        ]}
        onClearCompleted={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /cancel p\.txt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel u\.txt/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel c\.txt/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel f\.txt/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel x\.txt/i })).not.toBeInTheDocument()
  })

  it('clicking cancel button calls onCancel with task id', () => {
    const onCancel = vi.fn()
    render(
      <UploadDrawer
        tasks={[task({ id: 'abc', file: new File(['x'], 'big.bin'), status: 'uploading' })]}
        onClearCompleted={() => {}}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel big\.bin/i }))
    expect(onCancel).toHaveBeenCalledWith('abc')
  })
})
