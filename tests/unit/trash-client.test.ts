import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { restoreSession, TrashConflictError } from '../../src/lib/trash'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('restoreSession', () => {
  it('surfaces conflictKey from a 409 response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'conflict', conflictKey: 'docs/report.pdf' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(restoreSession(1716499000000)).rejects.toMatchObject({
      conflictKey: 'docs/report.pdf',
    })
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('keeps a generic error for non-conflict failures', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }))
    await expect(restoreSession(1716499000000)).rejects.not.toBeInstanceOf(TrashConflictError)
  })
})
