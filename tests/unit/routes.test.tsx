import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { Navigate } from 'react-router-dom'

import { routes } from '../../src/routes'

describe('app routes', () => {
  it('exposes /login route with element', () => {
    const r = routes.find((x) => x.path === '/login')
    expect(r).toBeDefined()
    expect(isValidElement(r!.element)).toBe(true)
  })

  it('exposes /files route with element', () => {
    const r = routes.find((x) => x.path === '/files')
    expect(r).toBeDefined()
    expect(isValidElement(r!.element)).toBe(true)
  })

  it('exposes /trash route with element', () => {
    const r = routes.find((x) => x.path === '/trash')
    expect(r).toBeDefined()
    expect(isValidElement(r!.element)).toBe(true)
  })

  it('exposes /settings route with element', () => {
    const r = routes.find((x) => x.path === '/settings')
    expect(r).toBeDefined()
    expect(isValidElement(r!.element)).toBe(true)
  })

  it('redirects / to /files via <Navigate>', () => {
    const r = routes.find((x) => x.path === '/')
    expect(r).toBeDefined()
    expect(isValidElement(r!.element)).toBe(true)
    const el = r!.element as React.ReactElement<{ to: string; replace?: boolean }>
    expect(el.type).toBe(Navigate)
    expect(el.props.to).toBe('/files')
    expect(el.props.replace).toBe(true)
  })
})
