import { describe, expect, it } from 'vitest'

import { escapeXml } from '../../functions/_shared/xml'

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
