import { RotateCcwIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    <div className="fixed bottom-4 right-4 z-40 flex w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b bg-foreground px-3 py-2 text-background">
        <span className="flex-1 text-sm font-medium">
          {t('files.upload.queueTitle')} · {tasks.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCompleted}
          disabled={!hasCompleted}
          className="text-background hover:bg-background/10 hover:text-background"
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
      <ul className="max-h-80 overflow-y-auto">
        {tasks.map((task) => {
          const canCancel = task.status === 'pending' || task.status === 'uploading'
          const canRetry = task.status === 'failed' || task.status === 'cancelled'
          const percent = task.total === 0 ? 0 : Math.round((task.loaded / task.total) * 100)
          return (
            <li
              key={task.id}
              className="flex flex-col gap-2 border-b border-border px-3 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate" title={task.file.name}>
                  {task.file.name}
                </span>
                <span className="text-xs text-muted-foreground">
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
                  className="h-1 overflow-hidden rounded bg-muted"
                >
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              ) : null}
              {task.status === 'failed' && task.error ? (
                <p className="text-xs text-destructive">{task.error}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
