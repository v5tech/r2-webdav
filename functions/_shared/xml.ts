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
