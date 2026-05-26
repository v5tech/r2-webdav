import { describe, expect, it } from 'vitest'

import {
  MULTISTATUS_CLOSE,
  MULTISTATUS_OPEN,
  escapeXml,
  renderPropResponse,
} from '../../functions/_shared/xml'

describe('escapeXml', () => {
  it('escapes ampersand first to avoid double-encoding', () => {
    expect(escapeXml('&')).toBe('&amp;')
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })

  it('escapes all 5 special chars', () => {
    expect(escapeXml('<')).toBe('&lt;')
    expect(escapeXml('>')).toBe('&gt;')
    expect(escapeXml('"')).toBe('&quot;')
    expect(escapeXml("'")).toBe('&apos;')
  })

  it('escapes a mixed payload', () => {
    expect(escapeXml(`a<b>"c'd&e.txt`)).toBe('a&lt;b&gt;&quot;c&apos;d&amp;e.txt')
  })

  it('passes through unicode unchanged', () => {
    expect(escapeXml('文件名_测试')).toBe('文件名_测试')
    expect(escapeXml('🎉/路径/<危险>.md')).toBe('🎉/路径/&lt;危险&gt;.md')
  })

  it('passes empty string through', () => {
    expect(escapeXml('')).toBe('')
  })

  it('produces XML that parses back to original', () => {
    const original = `a<b>"c'd&e.txt`
    const escaped = escapeXml(original)
    const xml = `<root><name>${escaped}</name></root>`
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror').length).toBe(0)
    expect(doc.querySelector('name')?.textContent).toBe(original)
  })
})

describe('MULTISTATUS_OPEN / MULTISTATUS_CLOSE', () => {
  it('open declares XML version and DAV/fd namespaces', () => {
    expect(MULTISTATUS_OPEN).toContain('<?xml version="1.0" encoding="utf-8" ?>')
    expect(MULTISTATUS_OPEN).toContain('<multistatus xmlns="DAV:" xmlns:fd="r2webdav">')
  })

  it('close ends multistatus root element', () => {
    expect(MULTISTATUS_CLOSE).toContain('</multistatus>')
  })

  it('concat with responses produces parseable XML', () => {
    const body =
      MULTISTATUS_OPEN +
      renderPropResponse({ href: '/webdav/a.txt', propsXml: '<getetag>x</getetag>' }) +
      MULTISTATUS_CLOSE
    const doc = new DOMParser().parseFromString(body, 'application/xml')
    expect(doc.getElementsByTagName('parsererror').length).toBe(0)
  })
})

describe('renderPropResponse', () => {
  it('renders standard 200 OK response shape', () => {
    const out = renderPropResponse({
      href: '/webdav/a.txt',
      propsXml: '<getetag>abc</getetag>',
    })
    expect(out).toContain('<response>')
    expect(out).toContain('<href>/webdav/a.txt</href>')
    expect(out).toContain('<propstat>')
    expect(out).toContain('<prop>')
    expect(out).toContain('<getetag>abc</getetag>')
    expect(out).toContain('<status>HTTP/1.1 200 OK</status>')
  })

  it('escapes XML special characters in href', () => {
    const out = renderPropResponse({
      href: '/webdav/a&b<c>.txt',
      propsXml: '',
    })
    expect(out).toContain('<href>/webdav/a&amp;b&lt;c&gt;.txt</href>')
    expect(out).not.toContain('a&b')
  })

  it('honours custom status (e.g. 404 for missing prop in <prop> selection)', () => {
    const out = renderPropResponse({
      href: '/webdav/a.txt',
      propsXml: '<unknown/>',
      status: 'HTTP/1.1 404 Not Found',
    })
    expect(out).toContain('<status>HTTP/1.1 404 Not Found</status>')
  })
})
