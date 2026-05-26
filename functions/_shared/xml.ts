const REPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => REPLACEMENTS[c])
}

export const MULTISTATUS_OPEN = `<?xml version="1.0" encoding="utf-8" ?>
<multistatus xmlns="DAV:" xmlns:r2="r2webdav">
`

export const MULTISTATUS_CLOSE = `
</multistatus>`

export function renderPropResponse(opts: {
  href: string
  propsXml: string
  status?: string
}): string {
  const status = opts.status ?? 'HTTP/1.1 200 OK'
  return `
  <response>
    <href>${escapeXml(opts.href)}</href>
    <propstat>
      <prop>
        ${opts.propsXml}
      </prop>
      <status>${status}</status>
    </propstat>
  </response>`
}

export function renderErrorResponse(opts: { href: string; status: string }): string {
  return `
  <response>
    <href>${escapeXml(opts.href)}</href>
    <status>${opts.status}</status>
  </response>`
}
