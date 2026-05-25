import { describe, expect, it } from 'vitest'

import { inferContentType } from '../../functions/_shared/mime'

describe('inferContentType', () => {
  it('uses extension table when matched (case-insensitive)', () => {
    expect(inferContentType('foo/bar.png', 'text/xml')).toBe('image/png')
    expect(inferContentType('a.JPEG', null)).toBe('image/jpeg')
    expect(inferContentType('a.pdf', null)).toBe('application/pdf')
    expect(inferContentType('clip.mp4', 'application/octet-stream')).toBe('video/mp4')
  })

  it('falls back to client CT when extension unknown and CT is not protocol mime', () => {
    expect(
      inferContentType(
        'foo.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  it('drops protocol XML mime to octet-stream when no ext match', () => {
    expect(inferContentType('foo.unknown', 'text/xml')).toBe('application/octet-stream')
    expect(inferContentType('foo.unknown', 'application/xml')).toBe('application/octet-stream')
    expect(inferContentType('foo.unknown', 'text/xml; charset=utf-8')).toBe(
      'application/octet-stream',
    )
    expect(inferContentType('foo.unknown', 'APPLICATION/XML')).toBe('application/octet-stream')
  })

  it('extension wins over protocol-mime client CT (webdav_client bug case)', () => {
    expect(inferContentType('photo.png', 'text/xml')).toBe('image/png')
    expect(inferContentType('backup.pdf', 'application/xml')).toBe('application/pdf')
    expect(inferContentType('clip.mp4', 'text/xml; charset=utf-8')).toBe('video/mp4')
  })

  it('returns octet-stream when no ext + no/empty/protocol client CT', () => {
    expect(inferContentType('noext', null)).toBe('application/octet-stream')
    expect(inferContentType('noext', '')).toBe('application/octet-stream')
    expect(inferContentType('noext', 'text/xml')).toBe('application/octet-stream')
  })

  it('treats dotfiles as having no extension', () => {
    expect(inferContentType('.gitignore', null)).toBe('application/octet-stream')
    expect(inferContentType('.env', 'text/plain')).toBe('text/plain')
  })
})
