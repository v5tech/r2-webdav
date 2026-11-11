import { RotateCcwIcon, UploadIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MimeIcon } from '@/components/files/MimeIcon'
import { Button } from '@/components/ui/button'
import type { UploadTask } from '@/hooks/use-upload-queue'
import { formatFileSize } from '@/lib/format'

interface UploadDrawerProps {
  tasks: UploadTask[]
  onClearCompleted: () => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
  onClose?: () => void
}

export function UploadDrawer({
  tasks,
  onClearCompleted,
  onCancel,
  onRetry,
  onClose,
}: UploadDrawerProps) {
  const { t } = useTranslation()
  if (tasks.length === 0) return null
  const hasCompleted = tasks.some((task) => task.status === 'completed')

  return (
    <div className="fixed right-4 bottom-[82px] z-40 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[14px] border bg-card shadow-lg md:right-6 md:bottom-6">
      <div className="flex items-center gap-2 border-b bg-foreground px-4 py-3.5 text-background">
        <span className="flex flex-1 items-center gap-2 text-[13px] font-semibold">
          <UploadIcon className="size-4" aria-hidden="true" />
          {t('files.upload.queueTitle')} · {tasks.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCompleted}
          disabled={!hasCompleted}
          className="h-auto rounded-md bg-background/5 px-2 py-[5px] text-[11px] font-normal text-background hover:bg-background/10 hover:text-background"
        >
          {t('files.upload.clearCompleted')}
        </Button>
        {onClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t('files.upload.close')}
            className="text-background hover:bg-background/10 hover:text-background"
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      <ul className="max-h-[360px] overflow-y-auto px-3.5 pt-1.5 pb-3">
        {tasks.map((task) => {
          const canCancel = task.status === 'pending' || task.status === 'uploading'
          const canRetry = task.status === 'failed' || task.status === 'cancelled'
          const percent = task.total === 0 ? 0 : Math.round((task.loaded / task.total) * 100)
          return (
            <li
              key={task.id}
              className="flex flex-col gap-2 border-t border-border py-[11px] first:border-t-0"
            >
              <div className="flex items-center gap-2.5 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
                  <MimeIcon contentType={task.file.type} className="size-4" />
                </span>
                <span className="flex-1 truncate text-xs font-medium" title={task.file.name}>
                  {task.file.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {task.status === 'uploading'
                    ? `${t('files.upload.status.uploading')} · ${percent}% · ${formatFileSize(task.loaded)} / ${formatFileSize(task.total)}`
                    : t(`files.upload.status.${task.status}`)}
                </span>
                {canCancel && onCancel ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t('files.upload.cancel')} ${task.file.name}`}
                    onClick={() => onCancel(task.id)}
                  >
                    <XIcon />
                  </Button>
                ) : null}
                {canRetry && onRetry ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t('files.retry')} ${task.file.name}`}
                    onClick={() => onRetry(task.id)}
                  >
                    <RotateCcwIcon />
                  </Button>
                ) : null}
              </div>
              {task.status === 'uploading' ? (
                <div
                  role="progressbar"
                  aria-valuenow={task.loaded}
                  aria-valuemin={0}
                  aria-valuemax={task.total}
                  aria-label={task.file.name}
                  className="ml-[46px] mt-1 h-1 overflow-hidden rounded bg-muted"
                >
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              ) : null}
              {task.status === 'completed' ? (
                <div className="ml-[46px] mt-1 h-1 overflow-hidden rounded bg-muted">
                  <div className="h-full w-full bg-emerald-500" />
                </div>
              ) : null}
              {task.status === 'failed' && task.error ? (
                <p className="ml-[46px] text-[11px] text-destructive">{task.error}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
