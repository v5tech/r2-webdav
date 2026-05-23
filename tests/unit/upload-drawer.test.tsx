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
})
