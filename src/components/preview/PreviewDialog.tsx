import { XIcon } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { MimeIcon, fileTypeClass } from '@/components/files/MimeIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatFileSize, formatFileTime, getFileTypeLabel } from '@/lib/format'
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
  'zip',
  'tar',
  'gz',
  'tgz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'exe',
  'dmg',
  'iso',
  'bin',
  'pkg',
  'msi',
  'apk',
  'deb',
  'rpm',
  'jar',
  'war',
])

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'rs',
  'go',
  'java',
  'kt',
  'kts',
  'swift',
  'php',
  'cs',
  'cpp',
  'cc',
  'c',
  'h',
  'hpp',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'bat',
  'sql',
  'graphql',
  'gql',
  'md',
  'mdx',
  'vue',
  'svelte',
])

const EXT_TO_SHIKI_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  json: 'json',
  jsonc: 'jsonc',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  ps1: 'powershell',
  bat: 'shellscript',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  md: 'markdown',
  mdx: 'mdx',
  vue: 'vue',
  svelte: 'svelte',
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
  const { t, i18n } = useTranslation()
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const kind = file ? pickPreviewKind(file) : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(760px,calc(100vw-32px))] max-w-none gap-0 rounded-2xl p-0 sm:max-w-[760px]"
        showCloseButton={false}
        onOpenAutoFocus={() => {
          returnFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          const returnFocus = returnFocusRef.current
          returnFocusRef.current = null
          if (returnFocus?.isConnected) {
            event.preventDefault()
            returnFocus.focus()
          }
        }}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b px-4 py-3.5">
          <DialogTitle className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold">
            {file ? (
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] ${fileTypeClass(file, false)}`}
              >
                <MimeIcon contentType={file.httpMetadata.contentType} className="size-[18px]" />
              </span>
            ) : null}
            <span className="truncate">{file ? extractFilename(file.key) : ''}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">{file?.key ?? ''}</DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-md"
              aria-label={t('preview.close')}
            >
              <XIcon />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto bg-muted/40">
          {file && (kind === 'code' || kind === 'text') ? (
            <div className="flex items-center justify-between border-b px-3.5 py-2.5 text-[11px] text-muted-foreground">
              <span>{t('preview.encoding', { type: getFileTypeLabel(file, false, i18n.language) })}</span>
              <span>{t('preview.readOnly')}</span>
            </div>
          ) : null}
          <div className="min-h-[340px]">{file ? dispatchBody(file) : null}</div>
        </div>
        {file ? (
          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t px-[18px] py-3.5 text-[11px] text-muted-foreground">
            <span>
              {t('preview.fileSize')}
              <strong className="mt-0.5 block text-xs font-medium text-foreground">
                {formatFileSize(file.size)}
              </strong>
              <small className="mt-[3px] block text-[10px]">
                {t('files.bytes', { value: file.size.toLocaleString() })}
              </small>
            </span>
            <span>
              {t('preview.modified')}
              <strong className="mt-0.5 block text-xs font-medium text-foreground tabular-nums">
                {formatFileTime(file.uploaded)}
              </strong>
              <small className="mt-[3px] block text-[10px]">
                {t('preview.utcTime', { time: formatFileTime(file.uploaded, undefined, 'UTC') })}
              </small>
            </span>
            <span>
              {t('preview.location')}
              <strong
                className="mt-0.5 block max-w-64 truncate text-xs font-medium text-foreground"
                title={file.key}
              >
                /{file.key}
              </strong>
            </span>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
