import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const HEADERS_PATH = path.resolve(__dirname, '../../public/_headers')

describe('public/_headers (CSP Report-Only)', () => {
  const content = readFileSync(HEADERS_PATH, 'utf-8')

  it('applies to all routes', () => {
    expect(content).toMatch(/^\/\*\s*$/m)
  })

  it('uses Report-Only (not enforce) during Phase 2b', () => {
    expect(content).toMatch(/Content-Security-Policy-Report-Only:/i)
    expect(content).not.toMatch(/^\s*Content-Security-Policy:/im)
  })

  it('declares directives required by pdfjs worker + wasm', () => {
    expect(content).toMatch(/worker-src\s+[^;]*\bblob:/)
    expect(content).toMatch(/script-src\s+[^;]*'wasm-unsafe-eval'/)
  })

  it('allows img/media blob: + data: for previews', () => {
    expect(content).toMatch(/img-src\s+[^;]*\bdata:/)
    expect(content).toMatch(/img-src\s+[^;]*\bblob:/)
    expect(content).toMatch(/media-src\s+[^;]*\bblob:/)
  })

  it('locks default-src and frame-ancestors', () => {
    expect(content).toMatch(/default-src\s+'self'/)
    expect(content).toMatch(/frame-ancestors\s+'none'/)
  })
})
