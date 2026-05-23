import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
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
import {
  fetchTrash,
  permanentDeleteSession,
  restoreSession,
  type TrashSession,
} from '@/lib/trash'

export default function TrashPage() {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<TrashSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyAt, setBusyAt] = useState<number | null>(null)

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
    void refresh()
  }, [refresh])

  const handleRestore = useCallback(
    async (deletedAt: number) => {
      setBusyAt(deletedAt)
      try {
        await restoreSession(deletedAt)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore')
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
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3 text-lg font-medium">
          {t('trash.title')}
        </div>
        <div className="flex-1 overflow-auto">
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
            <div className="p-12 text-center text-muted-foreground">{t('trash.empty')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('trash.deletedAt')}</th>
                  <th className="px-4 py-2 font-medium">{t('trash.entries')}</th>
                  <th className="px-4 py-2 font-medium">{t('trash.count')}</th>
                  <th className="px-4 py-2 font-medium">{t('trash.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.deletedAt} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2">
                      {new Date(session.deletedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {session.rootEntries.map((e) => (
                        <span
                          key={e}
                          className="mr-2 inline-block truncate align-middle font-medium"
                        >
                          {e}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{session.totalCount}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyAt === session.deletedAt}
                          onClick={() => void handleRestore(session.deletedAt)}
                        >
                          {t('trash.restore')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={busyAt === session.deletedAt}
                            >
                              {t('trash.permanentDelete')}
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
          )}
        </div>
      </div>
    </AppShell>
  )
}
