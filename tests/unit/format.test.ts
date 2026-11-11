import { describe, expect, it } from 'vitest'

import { formatFileSize, formatFileTime, getFileTypeLabel, splitFilename } from '../../src/lib/format'
import type { FileItem } from '../../src/lib/types'

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

describe('getFileTypeLabel', () => {
  function file(key: string, contentType: string): FileItem {
    return { key, size: 0, uploaded: 'Fri, 22 May 2026 10:00:00 GMT', httpMetadata: { contentType } }
  }

  it('uses friendly labels for folders, Markdown, PDF, text and images', () => {
    expect(getFileTypeLabel(file('docs/', 'application/x-directory'), true, 'zh-CN')).toBe('文件夹')
    expect(getFileTypeLabel(file('roadmap.md', 'text/markdown'), false, 'en-US')).toBe('Markdown')
    expect(getFileTypeLabel(file('guide.pdf', 'application/pdf'), false, 'zh-CN')).toBe('PDF 文档')
    expect(getFileTypeLabel(file('notes.txt', 'text/plain'), false, 'zh-CN')).toBe('纯文本')
    expect(getFileTypeLabel(file('photo.png', 'image/png'), false, 'en-US')).toBe('Image')
  })

  it('does not expose an unknown MIME type as the fallback', () => {
    expect(getFileTypeLabel(file('blob.bin', 'application/octet-stream'), false, 'en-US')).toBe('File')
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
