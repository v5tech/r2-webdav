import { describe, expect, it } from 'vitest'

import { pickPreviewKind } from '../../src/components/preview/PreviewDialog'
import type { FileItem } from '../../src/lib/types'

function makeFile(key: string, contentType: string): FileItem {
  return {
    key,
    size: 1024,
    uploaded: '2026-05-24T00:00:00Z',
    httpMetadata: { contentType },
  }
}

describe('pickPreviewKind', () => {
  it('routes image/* MIME to image', () => {
    expect(pickPreviewKind(makeFile('photo.jpg', 'image/jpeg'))).toBe('image')
  })

  it('routes video/* MIME to video', () => {
    expect(pickPreviewKind(makeFile('clip.mp4', 'video/mp4'))).toBe('video')
  })

  it('routes audio/* MIME to audio', () => {
    expect(pickPreviewKind(makeFile('song.mp3', 'audio/mpeg'))).toBe('audio')
  })

  it('routes application/pdf to pdf', () => {
    expect(pickPreviewKind(makeFile('doc.pdf', 'application/pdf'))).toBe('pdf')
  })

  it('routes text/* MIME for plain text to text', () => {
    expect(pickPreviewKind(makeFile('readme.txt', 'text/plain'))).toBe('text')
  })

  it('routes .ts extension to code regardless of MIME', () => {
    expect(pickPreviewKind(makeFile('a.ts', 'text/plain'))).toBe('code')
  })

  it('routes .py extension to code regardless of MIME', () => {
    expect(pickPreviewKind(makeFile('script.py', 'application/octet-stream'))).toBe('code')
  })

  it('routes .json extension to code (MIME application/json)', () => {
    expect(pickPreviewKind(makeFile('config.json', 'application/json'))).toBe('code')
  })

  it('routes .md extension to code', () => {
    expect(pickPreviewKind(makeFile('README.md', 'text/markdown'))).toBe('code')
  })

  it('routes .log to text (plain log)', () => {
    expect(pickPreviewKind(makeFile('server.log', 'text/plain'))).toBe('text')
  })

  it('falls back to unsupported when MIME is text/xml but extension is .zip (R2 sniff workaround)', () => {
    expect(pickPreviewKind(makeFile('backup.zip', 'text/xml'))).toBe('unsupported')
  })

  it('falls back to unsupported when MIME is text/plain but extension is .exe', () => {
    expect(pickPreviewKind(makeFile('installer.exe', 'text/plain'))).toBe('unsupported')
  })

  it('routes unknown MIME to unsupported', () => {
    expect(pickPreviewKind(makeFile('data.dat', 'application/octet-stream'))).toBe('unsupported')
  })

  it('handles nested key path correctly', () => {
    expect(pickPreviewKind(makeFile('folder/sub/archive.tar.gz', 'text/xml'))).toBe('unsupported')
  })

  it('handles keys without extension', () => {
    expect(pickPreviewKind(makeFile('LICENSE', 'text/plain'))).toBe('text')
  })
})
