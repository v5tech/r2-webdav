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
