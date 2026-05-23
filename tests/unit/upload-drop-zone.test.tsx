import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { UploadDropZone } from '../../src/components/files/UploadDropZone'

function dispatchDragEvent(
  type: string,
  files: File[] = [],
  target: EventTarget = window,
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: files.length ? ['Files'] : [], files, items: [] },
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

describe('UploadDropZone', () => {
  it('renders nothing initially', () => {
    const { container } = render(<UploadDropZone onDrop={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows overlay when dragenter with files', () => {
    render(<UploadDropZone onDrop={() => {}} />)
    dispatchDragEvent('dragenter', [new File(['x'], 'a.txt')])
    expect(screen.queryByText(/drop/i)).toBeInTheDocument()
  })

  it('ignores dragenter without files', () => {
    render(<UploadDropZone onDrop={() => {}} />)
    dispatchDragEvent('dragenter', [])
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument()
  })

  it('hides overlay on dragleave matching the dragenter count', () => {
    render(<UploadDropZone onDrop={() => {}} />)
    dispatchDragEvent('dragenter', [new File(['x'], 'a.txt')])
    expect(screen.queryByText(/drop/i)).toBeInTheDocument()
    dispatchDragEvent('dragleave', [new File(['x'], 'a.txt')])
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument()
  })

  it('on drop with files: calls onDrop and hides overlay', () => {
    const onDrop = vi.fn()
    render(<UploadDropZone onDrop={onDrop} />)
    const file = new File(['x'], 'a.txt')
    dispatchDragEvent('dragenter', [file])
    dispatchDragEvent('drop', [file])
    expect(onDrop).toHaveBeenCalledWith([file])
    expect(screen.queryByText(/drop/i)).not.toBeInTheDocument()
  })
})
