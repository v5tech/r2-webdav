import { AlertCircleIcon, Loader2Icon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
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
      <div className="px-5 py-6 md:px-8 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t('trash.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('trash.countDescription', { count: sessions.length })}
        </p>
        <div className="mb-5 mt-6 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RotateCcwIcon />
          </span>
          <div>
            <h2 className="text-sm font-medium">{t('trash.restoreTitle')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('trash.restoreDescription')}</p>
          </div>
        </div>
        <section className="overflow-hidden rounded-xl border bg-card">
          {loading ? (
            <div
              role="status"
              aria-label={t('files.loading')}
              className="flex items-center justify-center p-12"
            >
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          ) : error ? (
            <div role="alert" className="flex flex-col items-center gap-3 p-12">
              <AlertCircleIcon className="size-6 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void refresh()}>
                {t('files.retry')}
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <Trash2Icon className="mb-3 size-6 text-muted-foreground" />
              <p className="text-muted-foreground">{t('trash.empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t('trash.entries')}</th>
                    <th className="hidden w-52 px-4 py-2 font-medium md:table-cell">
                      {t('trash.deletedAt')}
                    </th>
                    <th className="hidden w-20 px-4 py-2 font-medium sm:table-cell">
                      {t('trash.count')}
                    </th>
                    <th className="w-56 px-4 py-2 font-medium">{t('trash.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.deletedAt} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Trash2Icon className="size-4" />
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
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground tabular-nums md:table-cell">
                        <time dateTime={new Date(session.deletedAt).toISOString()}>
                          {formatFileTime(session.deletedAt)}
                        </time>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {session.totalCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
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
                                size="sm"
                                disabled={busyAt === session.deletedAt}
                              >
                                <Trash2Icon />
                                <span className="hidden sm:inline">
                                  {t('trash.permanentDelete')}
                                </span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('trash.confirmDelete.title')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('trash.confirmDelete.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t('trash.confirmDelete.cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('trash.restoreConflictTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('trash.restoreConflictDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {conflict ? (
            <div className="px-6 pb-4">
              <span className="mb-2 block text-xs text-muted-foreground">
                {t('trash.conflictPath')}
              </span>
              <code className="block rounded-lg border bg-muted px-3 py-2 text-xs break-all">
                {conflict}
              </code>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConflict(null)}>
              {t('trash.closeConflict')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
