import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, apiKeys } from '../../src/lib/api'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiKeys', () => {
  it('me() returns stable tuple key', () => {
    expect(apiKeys.me()).toEqual(['api', 'me'])
  })
})

describe('api.me', () => {
  it('GETs /api/me with credentials:"include" and returns parsed JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await api.me()
    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/me')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
  })

  it('throws ApiError with status on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    )
    await expect(api.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })
  })

  it('throws ApiError with status on 500', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    await expect(api.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })
  })
})

describe('api.login', () => {
  it('POSTs /api/login with JSON body + credentials:"include"', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await api.login({ username: 'admin', password: 'secret' })
    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/login')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ username: 'admin', password: 'secret' })
  })

  it('throws ApiError with status 401 on wrong creds', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(api.login({ username: 'x', password: 'y' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })
  })
})

describe('api.logout', () => {
  it('POSTs /api/logout with credentials:"include" and resolves', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }))
    await expect(api.logout()).resolves.toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/logout')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
  })
})

describe('ApiError', () => {
  it('has name "ApiError" and exposes status', () => {
    const err = new ApiError(404, 'not found')
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.message).toBe('not found')
    expect(err).toBeInstanceOf(Error)
  })

  it('default message uses status when none provided', () => {
    const err = new ApiError(503)
    expect(err.message).toBe('HTTP 503')
  })
})
