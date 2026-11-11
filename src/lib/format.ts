import type { FileItem } from './types'

export function getFileTypeLabel(
  file: FileItem,
  directory: boolean,
  locale: string = navigator.language,
): string {
  const zh = locale.toLowerCase().startsWith('zh')
  if (directory) return zh ? '文件夹' : 'Folder'

  const type = file.httpMetadata.contentType || ''
  const name = file.key.toLowerCase()
  if (/\.(md|mdx)$/.test(name)) return 'Markdown'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return zh ? 'PDF 文档' : 'PDF document'
  if (type.startsWith('image/')) return zh ? '图片' : 'Image'
  if (type.startsWith('video/')) return zh ? '视频' : 'Video'
  if (type.startsWith('audio/')) return zh ? '音频' : 'Audio'
  if (type.includes('json') || /\.(json|jsonc)$/.test(name)) return 'JSON'
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rb|rs|go|java|kt|swift|php|cs|cpp|c|h|css|html|sh|sql|vue|svelte)$/.test(name)) {
    return zh ? '代码' : 'Code'
  }
  if (type.startsWith('text/')) return zh ? '纯文本' : 'Plain text'
  return zh ? '文件' : 'File'
}

export function formatFileTime(
  value: string | number | Date,
  locale: string = navigator.language,
  timeZone?: string,
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}

export function formatFileSize(bytes: number, locale: string = navigator.language): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < units.length - 1)
  const maximumFractionDigits = value < 10 ? 2 : value < 100 ? 1 : 0
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${units[unitIndex]}`
}

export function splitFilename(name: string): { stem: string; extension: string } {
  const index = name.lastIndexOf('.')
  if (index <= 0) return { stem: name, extension: '' }
  return { stem: name.slice(0, index), extension: name.slice(index) }
}
