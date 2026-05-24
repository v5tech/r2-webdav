import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FileItem } from '@/lib/types'

import { AudioPreview } from './AudioPreview'
import { CodePreview } from './CodePreview'
import { ImagePreview } from './ImagePreview'
import { PdfPreview } from './PdfPreview'
import { TextPreview } from './TextPreview'
import { UnsupportedPreview } from './UnsupportedPreview'
import { VideoPreview } from './VideoPreview'

interface PreviewDialogProps {
  file: FileItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function extractFilename(key: string) {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

const KNOWN_BINARY_EXTENSIONS = new Set([
  'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar',
  'exe', 'dmg', 'iso', 'bin', 'pkg', 'msi', 'apk', 'deb', 'rpm', 'jar', 'war',
])

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'rs', 'go', 'java', 'kt', 'kts', 'swift', 'php', 'cs',
  'cpp', 'cc', 'c', 'h', 'hpp',
  'json', 'jsonc', 'yaml', 'yml', 'toml',
  'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat',
  'sql', 'graphql', 'gql',
  'md', 'mdx',
  'vue', 'svelte',
])

const EXT_TO_SHIKI_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin', kts: 'kotlin',
  swift: 'swift', php: 'php', cs: 'csharp',
  cpp: 'cpp', cc: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  json: 'json', jsonc: 'jsonc', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  xml: 'xml', html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'fish', ps1: 'powershell', bat: 'shellscript',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  md: 'markdown', mdx: 'mdx',
  vue: 'vue', svelte: 'svelte',
}

function getExt(key: string): string {
  const name = extractFilename(key)
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : ''
}

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'text' | 'unsupported'

export function pickPreviewKind(file: FileItem): PreviewKind {
  const type = file.httpMetadata.contentType
  const ext = getExt(file.key)
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf') return 'pdf'
  if (KNOWN_BINARY_EXTENSIONS.has(ext)) return 'unsupported'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (type.startsWith('text/')) return 'text'
  return 'unsupported'
}

function dispatchBody(file: FileItem) {
  const kind = pickPreviewKind(file)
  switch (kind) {
    case 'image':
      return <ImagePreview fileKey={file.key} name={extractFilename(file.key)} />
    case 'video':
      return <VideoPreview fileKey={file.key} />
    case 'audio':
      return <AudioPreview fileKey={file.key} />
    case 'pdf':
      return <PdfPreview fileKey={file.key} />
    case 'code': {
      const ext = getExt(file.key)
      const lang = EXT_TO_SHIKI_LANG[ext] ?? 'plaintext'
      return <CodePreview fileKey={file.key} size={file.size} lang={lang} />
    }
    case 'text':
      return <TextPreview fileKey={file.key} size={file.size} />
    default:
      return <UnsupportedPreview fileKey={file.key} />
  }
}

export function PreviewDialog({ file, open, onOpenChange }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{file ? extractFilename(file.key) : ''}</DialogTitle>
          <DialogDescription className="sr-only">{file?.key ?? ''}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-auto">{file ? dispatchBody(file) : null}</div>
      </DialogContent>
    </Dialog>
  )
}
