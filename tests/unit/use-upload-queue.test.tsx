import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useUploadQueue } from '../../src/hooks/use-upload-queue'

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  if (!('randomUUID' in crypto)) {
    let i = 0
    ;(crypto as { randomUUID: () => string }).randomUUID = () => `id-${i++}`
  }
})

describe('useUploadQueue', () => {
  it('starts empty', () => {
    const upload = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    expect(result.current.tasks).toEqual([])
  })

  it('enqueue adds pending tasks', async () => {
    const d = deferred<void>()
    const upload = vi.fn(() => d.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('docs/', [
        new File(['x'], 'a.txt'),
        new File(['y'], 'b.txt'),
      ])
    })
    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[1].status).toBe('pending')
  })

  it('serially processes the first pending task', async () => {
    const d = deferred<void>()
    const upload = vi.fn(() => d.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('docs/', [new File(['x'], 'a.txt')])
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('uploading'))
    expect(upload).toHaveBeenCalledWith(
      'docs/a.txt',
      expect.any(File),
      expect.any(Function),
    )
  })

  it('marks task completed when upload resolves', async () => {
    const d = deferred<void>()
    const upload = vi.fn(() => d.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('', [new File(['x'], 'a.txt')])
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('uploading'))
    await act(async () => {
      d.resolve()
      await d.promise
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('completed'))
  })

  it('marks task failed and stores error message on rejection', async () => {
    const d = deferred<void>()
    const upload = vi.fn(() => d.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('', [new File(['x'], 'bad.txt')])
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('uploading'))
    await act(async () => {
      d.reject(new Error('boom'))
      await d.promise.catch(() => {})
    })
    await waitFor(() => {
      expect(result.current.tasks[0].status).toBe('failed')
      expect(result.current.tasks[0].error).toBe('boom')
    })
  })

  it('processes 2nd pending only after 1st completes', async () => {
    const d1 = deferred<void>()
    const d2 = deferred<void>()
    const upload = vi
      .fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('', [new File(['1'], 'a.txt'), new File(['2'], 'b.txt')])
    })
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    expect(result.current.tasks[1].status).toBe('pending')
    await act(async () => {
      d1.resolve()
      await d1.promise
    })
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(upload.mock.calls[1][1].name).toBe('b.txt')
  })

  it('progress callback updates loaded', async () => {
    const d = deferred<void>()
    let progressCb: ((loaded: number, total: number) => void) | undefined
    const upload = vi.fn((_key, _file, onProgress) => {
      progressCb = onProgress
      return d.promise
    })
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('', [new File(['x'.repeat(100)], 'a.txt')])
    })
    await waitFor(() => expect(progressCb).toBeDefined())
    act(() => progressCb!(50, 100))
    await waitFor(() => expect(result.current.tasks[0].loaded).toBe(50))
  })

  it('clearCompleted removes completed tasks only', async () => {
    const d1 = deferred<void>()
    const d2 = deferred<void>()
    const upload = vi
      .fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise)
    const { result } = renderHook(() => useUploadQueue({ upload }))
    act(() => {
      result.current.enqueue('', [new File(['1'], 'a.txt'), new File(['2'], 'b.txt')])
    })
    await act(async () => {
      d1.resolve()
      await d1.promise
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('completed'))
    act(() => result.current.clearCompleted())
    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1)
      expect(result.current.tasks[0].file.name).toBe('b.txt')
    })
  })

  it('calls onCompleted with completed task', async () => {
    const d = deferred<void>()
    const upload = vi.fn(() => d.promise)
    const onCompleted = vi.fn()
    const { result } = renderHook(() => useUploadQueue({ upload, onCompleted }))
    act(() => {
      result.current.enqueue('docs/', [new File(['x'], 'a.txt')])
    })
    await waitFor(() => expect(result.current.tasks[0].status).toBe('uploading'))
    await act(async () => {
      d.resolve()
      await d.promise
    })
    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
    expect(onCompleted.mock.calls[0][0].status).toBe('completed')
  })
})
