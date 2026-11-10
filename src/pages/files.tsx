import {
  AlertCircleIcon,
  ChevronDownIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  UploadIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { Breadcrumb } from '@/components/files/Breadcrumb'
import { FileCard } from '@/components/files/FileCard'
import { FileGrid } from '@/components/files/FileGrid'
import { FileList } from '@/components/files/FileList'
import { FileRow } from '@/components/files/FileRow'
import { NewFolderDialog } from '@/components/files/NewFolderDialog'
import { RenameDialog } from '@/components/files/RenameDialog'
import { SearchBar } from '@/components/files/SearchBar'
import { SelectionToolbar } from '@/components/files/SelectionToolbar'
import { type SortDir, type SortKey, SortControls } from '@/components/files/SortControls'
import { UploadDrawer } from '@/components/files/UploadDrawer'
import { UploadDropZone } from '@/components/files/UploadDropZone'
import { type ViewMode, ViewToggle } from '@/components/files/ViewToggle'
import { AppShell } from '@/components/layout/AppShell'
import { PreviewDialog } from '@/components/preview/PreviewDialog'
import { TextPadDrawer } from '@/components/textpad/TextPadDrawer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFileSelection } from '@/hooks/use-file-selection'
import { useUploadQueue } from '@/hooks/use-upload-queue'
import { splitFilename } from '@/lib/format'
import type { FileItem } from '@/lib/types'
import { deleteFile, encodeKey, fetchPath, isDirectory } from '@/lib/webdav'

function extractFilename(key: string): string {
  return key.replace(/\/$/, '').split('/').pop() ?? key
}

function sortItems(items: FileItem[], key: SortKey, dir: SortDir): FileItem[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const aIsDir = isDirectory(a)
    const bIsDir = isDirectory(b)
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    if (key === 'size') return (a.size - b.size) * factor
    if (key === 'modified') {
      return (new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime()) * factor
    }
    return extractFilename(a.key).localeCompare(extractFilename(b.key)) * factor
  })
}

interface ConflictState {
  cwd: string
  files: File[]
  conflictingNames: string[]
}

export default function FilesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawCwd = searchParams.get('p')
  const cwd = rawCwd ? (rawCwd.endsWith('/') ? rawCwd : rawCwd + '/') : ''
  const setCwd = useCallback(
    (next: string) => {
      setSearchParams(next ? { p: next } : {})
    },
    [setSearchParams],
  )
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortKey, setSortKey] = useState<SortKey>('modified')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [textpadOpen, setTextpadOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [conflict, setConflict] = useState<ConflictState | null>(null)
  const [notice, setNotice] = useState<{ message: string; action?: 'trash' } | null>(null)
  const [uploadPanelOpen, setUploadPanelOpen] = useState(true)
  const selection = useFileSelection()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const queue = useUploadQueue({ onCompleted: () => void refresh() })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await fetchPath(cwd)
      setFiles(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [cwd])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const visibleFiles = useMemo(() => {
    const filtered = search
      ? files.filter((f) => extractFilename(f.key).toLowerCase().includes(search.toLowerCase()))
      : files
    return sortItems(filtered, sortKey, sortDir)
  }, [files, search, sortKey, sortDir])

  const handleSortChange = useCallback((key: SortKey, dir: SortDir) => {
    setSortKey(key)
    setSortDir(dir)
  }, [])

  const handleDelete = useCallback(
    async (file: FileItem) => {
      try {
        await deleteFile(file.key)
        setNotice({
          message: t('files.deletedSuccess', { name: extractFilename(file.key) }),
          action: 'trash',
        })
        void refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
      }
    },
    [refresh, t],
  )

  const handleBulkDelete = useCallback(async () => {
    const keys = Array.from(selection.selected)
    try {
      await Promise.all(keys.map((k) => deleteFile(k)))
      selection.clear()
      setNotice({
        message: t('files.deletedSuccess', {
          name: t('files.selection.count', { count: keys.length }),
        }),
        action: 'trash',
      })
      void refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }, [refresh, selection, t])

  const downloadableCount = files.filter(
    (file) => selection.has(file.key) && !isDirectory(file),
  ).length

  const handleBulkDownload = useCallback(() => {
    files
      .filter((file) => selection.has(file.key) && !isDirectory(file))
      .forEach((file) => {
        const a = document.createElement('a')
        a.href = `/webdav/${encodeKey(file.key)}`
        a.download = ''
        a.click()
      })
  }, [files, selection])

  const handleSelect = useCallback(
    (key: string, selected: boolean) => {
      if (selected !== selection.has(key)) selection.toggle(key)
    },
    [selection],
  )

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) selection.selectAll(visibleFiles.map((file) => file.key))
      else selection.clear()
    },
    [selection, visibleFiles],
  )

  const getUsedNames = useCallback(
    (folder: string) =>
      new Set([
        ...files.map((file) => extractFilename(file.key)),
        ...queue.tasks.filter((task) => task.cwd === folder).map((task) => task.file.name),
      ]),
    [files, queue.tasks],
  )

  const handleIncomingFiles = useCallback(
    (folder: string, incoming: File[]): boolean => {
      const usedNames = getUsedNames(folder)
      const incomingNames = new Set<string>()
      const conflictingNames = new Set<string>()
      for (const file of incoming) {
        if (usedNames.has(file.name) || incomingNames.has(file.name)) {
          conflictingNames.add(file.name)
        }
        incomingNames.add(file.name)
      }
      if (conflictingNames.size > 0) {
        setConflict({ cwd: folder, files: incoming, conflictingNames: [...conflictingNames] })
        return true
      }
      setUploadPanelOpen(true)
      queue.enqueue(folder, incoming)
      return false
    },
    [getUsedNames, queue],
  )

  function resolveConflict(action: 'overwrite' | 'rename') {
    if (!conflict) return
    if (action === 'overwrite') {
      queue.enqueue(conflict.cwd, conflict.files)
    } else {
      const used = getUsedNames(conflict.cwd)
      const renamed = conflict.files.map((file) => {
        const { stem, extension } = splitFilename(file.name)
        let index = 1
        let name = file.name
        while (used.has(name)) {
          name = `${stem} (${index})${extension}`
          index += 1
        }
        used.add(name)
        return new File([file], name, { type: file.type, lastModified: file.lastModified })
      })
      queue.enqueue(conflict.cwd, renamed)
    }
    setUploadPanelOpen(true)
    setConflict(null)
    setTextpadOpen(false)
  }

  return (
    <AppShell>
      <div className="flex min-h-full flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-5 md:px-8 md:py-6">
          <div>
            <Breadcrumb cwd={cwd} onCwdChange={setCwd} />
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {cwd ? extractFilename(cwd) : t('nav.allFiles')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('files.count', { count: files.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <PlusIcon />
                  {t('files.create')}
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setNewFolderOpen(true)}>
                  <FolderPlusIcon />
                  {t('files.newFolder.title')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTextpadOpen(true)}>
                  <FileTextIcon />
                  {t('textpad.title')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              className="hidden"
              data-testid="upload-input"
              onChange={(event) => {
                const incoming = Array.from(event.target.files ?? [])
                if (incoming.length) handleIncomingFiles(cwd, incoming)
                event.target.value = ''
              }}
            />
            <Button onClick={() => uploadInputRef.current?.click()}>
              <UploadIcon />
              {t('files.upload.button')}
            </Button>
          </div>
        </div>

        <section className="mx-4 mb-4 overflow-hidden rounded-xl border bg-card md:mx-8">
          {selection.count > 0 ? (
            <SelectionToolbar
              selectedCount={selection.count}
              onClear={selection.clear}
              onDelete={() => void handleBulkDelete()}
              onDownload={handleBulkDownload}
              canDownload={downloadableCount > 0}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              <div className="w-full max-w-sm sm:w-64">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SortControls sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange} />
                <ViewToggle view={viewMode} onViewChange={setViewMode} />
              </div>
            </div>
          )}

          <div>
            {loading ? (
              <div role="status" aria-label={t('files.loading')} className="p-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="flex h-14 items-center gap-3 border-b last:border-b-0"
                  >
                    <span className="size-4 animate-pulse rounded bg-muted" />
                    <span className="size-9 animate-pulse rounded-lg bg-muted" />
                    <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div role="alert" className="flex flex-col items-center gap-3 p-12 text-center">
                <AlertCircleIcon className="size-6 text-destructive" />
                <p className="font-medium">{t('files.loadError')}</p>
                <p className="text-sm text-muted-foreground">{t('files.loadErrorDescription')}</p>
                <p className="text-xs text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void refresh()}>
                  {t('files.retry')}
                </Button>
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="flex flex-col items-center p-12 text-center">
                <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {search ? <AlertCircleIcon /> : <FolderIcon />}
                </span>
                <h2 className="text-base font-medium">
                  {search ? t('files.searchEmpty') : t('files.empty')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {search ? t('files.searchEmptyDescription') : t('files.emptyDescription')}
                </p>
                {!search ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
                      <FolderPlusIcon />
                      {t('files.newFolder.title')}
                    </Button>
                    <Button onClick={() => uploadInputRef.current?.click()}>
                      <UploadIcon />
                      {t('files.upload.button')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : viewMode === 'grid' ? (
              <FileGrid
                items={visibleFiles}
                renderItem={(item) => (
                  <FileCard
                    key={item.key}
                    file={item}
                    onCwdChange={setCwd}
                    onRename={setRenameTarget}
                    onDelete={handleDelete}
                    onPreview={setPreviewFile}
                    selected={selection.has(item.key)}
                    onSelect={handleSelect}
                  />
                )}
              />
            ) : (
              <FileList
                items={visibleFiles}
                onSelectAll={handleSelectAll}
                allSelected={
                  visibleFiles.length > 0 && visibleFiles.every((file) => selection.has(file.key))
                }
                renderItem={(item) => (
                  <FileRow
                    key={item.key}
                    file={item}
                    onCwdChange={setCwd}
                    onRename={setRenameTarget}
                    onDelete={handleDelete}
                    onPreview={setPreviewFile}
                    selected={selection.has(item.key)}
                    onSelect={handleSelect}
                  />
                )}
              />
            )}
          </div>
          <footer className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            <span>{t('files.showing', { visible: visibleFiles.length, total: files.length })}</span>
            <span className="hidden sm:inline">
              {t('files.timeZone', {
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </span>
          </footer>
        </section>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        cwd={cwd}
        existingNames={files.map((file) => extractFilename(file.key))}
        onCreated={() => void refresh()}
      />
      <TextPadDrawer
        key={textpadOpen ? 'open' : 'closed'}
        open={textpadOpen}
        onOpenChange={setTextpadOpen}
        cwd={cwd}
        onSave={(file, folder) => handleIncomingFiles(folder, [file])}
      />
      <RenameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
        file={renameTarget}
        onRenamed={() => void refresh()}
      />
      <UploadDropZone onDrop={(incoming) => handleIncomingFiles(cwd, incoming)} />
      {uploadPanelOpen ? (
        <UploadDrawer
          tasks={queue.tasks}
          onClearCompleted={queue.clearCompleted}
          onCancel={queue.cancel}
          onRetry={queue.retry}
          onClose={() => setUploadPanelOpen(false)}
        />
      ) : null}
      <PreviewDialog
        file={previewFile}
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null)
        }}
      />
      <AlertDialog open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('files.conflict.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {conflict?.conflictingNames.map((name) => (
                <span key={name} className="block">
                  {t('files.conflict.exists', { name })}
                </span>
              ))}
              {t('files.conflict.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('files.conflict.cancel')}</AlertDialogCancel>
            <Button variant="outline" onClick={() => resolveConflict('rename')}>
              {t('files.conflict.rename')}
            </Button>
            <AlertDialogAction onClick={() => resolveConflict('overwrite')}>
              {t('files.conflict.overwrite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {notice ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-foreground px-4 py-3 text-xs text-background shadow-lg"
        >
          <span>{notice.message}</span>
          {notice.action === 'trash' ? (
            <Link to="/trash" className="font-medium underline underline-offset-2">
              {t('files.viewTrash')}
            </Link>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  )
}
