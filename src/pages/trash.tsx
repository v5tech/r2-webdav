import {
  AlertCircleIcon,
  FileCodeIcon,
  FolderIcon,
  Loader2Icon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatFileTime } from '@/lib/format'
import {
  fetchTrash,
  permanentDeleteSession,
  restoreSession,
  TrashConflictError,
  type TrashSession,
} from '@/lib/trash'

export default function TrashPage() {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<TrashSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyAt, setBusyAt] = useState<number | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSessions(await fetchTrash())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 组件挂载触发初次 fetch; 后续迁移 react-query 后清理
    void refresh()
  }, [refresh])

  const handleRestore = useCallback(
    async (deletedAt: number) => {
      setBusyAt(deletedAt)
      try {
        await restoreSession(deletedAt)
        await refresh()
      } catch (err) {
        if (err instanceof TrashConflictError) {
          setConflict(err.conflictKey)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to restore')
        }
      } finally {
        setBusyAt(null)
      }
    },
    [refresh],
  )

  const handlePermanentDelete = useCallback(
    async (deletedAt: number) => {
      setBusyAt(deletedAt)
      try {
        await permanentDeleteSession(deletedAt)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
      } finally {
        setBusyAt(null)
      }
    },
    [refresh],
  )

  return (
    <AppShell>
      <div className="mx-auto min-h-full w-full max-w-[1440px] px-4 pt-5 pb-7 md:px-8 md:pt-[22px] md:pb-12">
        <div className="mb-[18px]">
          <h1 className="text-[clamp(25px,2.4vw,31px)] leading-[1.2] font-semibold tracking-[-0.035em]">
            {t('trash.title')}
          </h1>
          <p className="mt-[7px] text-[13px] leading-normal text-muted-foreground">
            {t('trash.countDescription', { count: sessions.length })}
          </p>
        </div>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
            <RotateCcwIcon />
          </span>
          <div>
            <h2 className="text-sm font-medium">{t('trash.restoreTitle')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('trash.restoreDescription')}</p>
          </div>
        </div>
        <section className="overflow-hidden rounded-[14px] border bg-card">
          {loading ? (
            <div
              role="status"
              aria-label={t('files.loading')}
              className="flex items-center justify-center px-6 py-16"
            >
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          ) : error ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex size-[52px] items-center justify-center rounded-[14px] bg-destructive/10 text-destructive">
                <AlertCircleIcon />
              </span>
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                className="h-10 rounded-md bg-card px-3.5 text-[13px] font-semibold"
                onClick={() => void refresh()}
              >
                {t('files.reload')}
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 flex size-[52px] items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                <Trash2Icon />
              </span>
              <p className="text-muted-foreground">{t('trash.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="h-[38px] px-3.5 font-medium">{t('trash.entries')}</th>
                    <th className="hidden h-[38px] w-[204px] px-3.5 font-medium md:table-cell">
                      {t('trash.deletedAt')}
                    </th>
                    <th className="hidden h-[38px] w-20 px-3.5 font-medium sm:table-cell">
                      {t('trash.count')}
                    </th>
                    <th className="h-[38px] w-56 px-3.5 font-medium">{t('trash.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.deletedAt} className="h-[58px] border-b last:border-b-0">
                      <td className="px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-[9px] ${
                              session.totalCount > 1
                                ? 'bg-primary/10 text-primary'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {session.totalCount > 1 ? (
                              <FolderIcon className="size-4" />
                            ) : (
                              <FileCodeIcon className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0">
                            {session.rootEntries.map((entry) => (
                              <span
                                key={entry}
                                className="block truncate font-medium"
                                title={entry}
                              >
                                {entry}
                              </span>
                            ))}
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {t('files.count', { count: session.totalCount })}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-3.5 text-xs text-muted-foreground tabular-nums md:table-cell">
                        <time dateTime={new Date(session.deletedAt).toISOString()}>
                          {formatFileTime(session.deletedAt)}
                        </time>
                      </td>
                      <td className="hidden px-3.5 text-xs text-muted-foreground sm:table-cell">
                        {session.totalCount}
                      </td>
                      <td className="px-3.5">
                        <div className="flex gap-[7px]">
                          <Button
                            variant="outline"
                            className="h-[34px] rounded-md px-[11px] text-[13px] font-semibold"
                            disabled={busyAt === session.deletedAt}
                            onClick={() => void handleRestore(session.deletedAt)}
                          >
                            <RotateCcwIcon />
                            <span className="hidden sm:inline">{t('trash.restore')}</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                className="h-[34px] rounded-md px-[11px] text-[13px] font-semibold"
                                disabled={busyAt === session.deletedAt}
                              >
                                <Trash2Icon />
                                <span className="hidden sm:inline">
                                  {t('trash.permanentDelete')}
                                </span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[min(480px,calc(100vw-32px))] max-w-none gap-0 rounded-2xl p-0 data-[size=default]:max-w-[calc(100vw-32px)] sm:max-w-[480px] data-[size=default]:sm:max-w-[480px]">
                              <AlertDialogHeader className="place-items-start border-b px-4 py-3.5 text-left">
                                <AlertDialogTitle className="text-[13px] font-semibold">
                                  {t('trash.confirmDelete.title')}
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogDescription className="p-6 text-[13px] leading-[1.7]">
                                {t('trash.confirmDelete.description')}
                              </AlertDialogDescription>
                              <AlertDialogFooter className="m-0 flex-row justify-end gap-2.5 px-[18px] py-3.5">
                                <AlertDialogCancel className="h-10 rounded-md px-3.5 text-[13px] font-semibold">
                                  {t('trash.confirmDelete.cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
                                  onClick={() => void handlePermanentDelete(session.deletedAt)}
                                >
                                  {t('trash.confirmDelete.confirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <AlertDialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <AlertDialogContent className="w-[min(480px,calc(100vw-32px))] max-w-none gap-0 rounded-2xl p-0 data-[size=default]:max-w-[calc(100vw-32px)] sm:max-w-[480px] data-[size=default]:sm:max-w-[480px]">
          <AlertDialogHeader className="place-items-start border-b px-4 py-3.5 text-left">
            <AlertDialogTitle className="text-[13px] font-semibold">
              {t('trash.restoreConflictTitle')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="p-6 pb-0 text-[13px] leading-[1.7]">
            {t('trash.restoreConflictDescription')}
          </AlertDialogDescription>
          {conflict ? (
            <div className="px-6 pt-4 pb-6">
              <span className="mb-2 block text-xs text-muted-foreground">
                {t('trash.conflictPath')}
              </span>
              <code className="block rounded-lg border bg-muted px-3 py-2 text-xs break-all">
                {conflict}
              </code>
            </div>
          ) : null}
          <AlertDialogFooter className="m-0 flex-row justify-end px-[18px] py-3.5">
            <AlertDialogAction
              className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
              onClick={() => setConflict(null)}
            >
              {t('trash.closeConflict')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
