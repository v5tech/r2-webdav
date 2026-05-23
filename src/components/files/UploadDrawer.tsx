import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { UploadTask } from '@/hooks/use-upload-queue'

interface UploadDrawerProps {
  tasks: UploadTask[]
  onClearCompleted: () => void
}

export function UploadDrawer({ tasks, onClearCompleted }: UploadDrawerProps) {
  const { t } = useTranslation()
  if (tasks.length === 0) return null
  const hasCompleted = tasks.some((task) => task.status === 'completed')

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col rounded-md border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex-1 text-sm font-medium">{t('files.upload.queueTitle')}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearCompleted}
          disabled={!hasCompleted}
        >
          {t('files.upload.clearCompleted')}
        </Button>
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-1 border-b border-border px-3 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{task.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {t(`files.upload.status.${task.status}`)}
              </span>
            </div>
            {task.status === 'uploading' ? (
              <div
                role="progressbar"
                aria-valuenow={task.loaded}
                aria-valuemin={0}
                aria-valuemax={task.total}
                className="h-1 overflow-hidden rounded bg-muted"
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${task.total === 0 ? 0 : (task.loaded / task.total) * 100}%`,
                  }}
                />
              </div>
            ) : null}
            {task.status === 'failed' && task.error ? (
              <p className="text-xs text-destructive">{task.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
