const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  m4v: 'video/x-m4v',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  pdf: 'application/pdf',
  txt: 'text/plain',
}

const PROTOCOL_MIME_RE = /^(text|application)\/xml(\s*;.*)?$/i

export function inferContentType(path: string, clientCT: string | null): string {
  const name = path.split('/').pop() ?? ''
  const dotIdx = name.lastIndexOf('.')
  const ext = dotIdx > 0 ? name.slice(dotIdx + 1).toLowerCase() : ''
  if (ext && MIME_BY_EXT[ext]) return MIME_BY_EXT[ext]
  if (clientCT && !PROTOCOL_MIME_RE.test(clientCT)) return clientCT
  return 'application/octet-stream'
}
