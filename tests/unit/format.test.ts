import { describe, expect, it } from 'vitest'

import { formatFileSize, formatFileTime, splitFilename } from '../../src/lib/format'

describe('formatFileTime', () => {
  it('uses the browser locale and includes seconds', () => {
    const result = formatFileTime('2026-05-29T06:32:08Z', 'zh-CN')
    expect(result).toContain('14:32:08')
    expect(result).toContain('2026')
  })

  it('supports an explicit UTC display', () => {
    const result = formatFileTime('2026-05-29T06:32:08Z', 'en-US', 'UTC')
    expect(result).toContain('06:32:08')
  })

  it('returns a placeholder for an invalid timestamp', () => {
    expect(formatFileTime('invalid', 'en-US')).toBe('—')
  })
})

describe('formatFileSize', () => {
  it('uses binary units with useful precision', () => {
    expect(formatFileSize(18420, 'en-US')).toBe('18 KB')
    expect(formatFileSize(8821145, 'en-US')).toBe('8.41 MB')
    expect(formatFileSize(155189248, 'en-US')).toBe('148 MB')
  })

  it('keeps bytes for small files', () => {
    expect(formatFileSize(640, 'en-US')).toBe('640 B')
  })
})

describe('splitFilename', () => {
  it('keeps the extension visible separately', () => {
    expect(splitFilename('report.final.pdf')).toEqual({ stem: 'report.final', extension: '.pdf' })
  })

  it('does not split folders or extension-less names', () => {
    expect(splitFilename('Documents')).toEqual({ stem: 'Documents', extension: '' })
    expect(splitFilename('.env')).toEqual({ stem: '.env', extension: '' })
  })
})
