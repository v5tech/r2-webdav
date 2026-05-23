import { AlertCircleIcon, FolderPlusIcon, Loader2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

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
import { Button } from '@/components/ui/button'
import { useFileSelection } from '@/hooks/use-file-selection'
import { useUploadQueue } from '@/hooks/use-upload-queue'
import type { FileItem } from '@/lib/types'
import { deleteFile, fetchPath, isDirectory } from '@/lib/webdav'

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null)
  const selection = useFileSelection()
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

  const visibleFiles = useMemo(() => {
    const filtered = search
      ? files.filter((f) =>
          extractFilename(f.key).toLowerCase().includes(search.toLowerCase()),
        )
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
        void refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete')
      }
    },
    [refresh],
  )

  const handleBulkDelete = useCallback(async () => {
    const keys = Array.from(selection.selected)
    try {
      await Promise.all(keys.map((k) => deleteFile(k)))
      selection.clear()
      void refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }, [refresh, selection])

  const handleBulkDownload = useCallback(() => {
    selection.selected.forEach((key) => {
      const a = document.createElement('a')
      a.href = `/webdav/${key.split('/').map(encodeURIComponent).join('/')}`
      a.download = ''
      a.click()
    })
  }, [selection.selected])

  return (
    <AppShell onUpload={(files) => queue.enqueue(cwd, files)}>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <Breadcrumb cwd={cwd} onCwdChange={setCwd} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewFolderOpen(true)}
            aria-label={t('files.newFolder.title')}
          >
            <FolderPlusIcon />
            {t('files.newFolder.title')}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-48">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <SortControls
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
            />
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
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
                />
              )}
            />
          ) : (
            <FileList
              items={visibleFiles}
              renderItem={(item) => (
                <FileRow
                  key={item.key}
                  file={item}
                  onCwdChange={setCwd}
                  onRename={setRenameTarget}
                  onDelete={handleDelete}
                />
              )}
            />
          )}
        </div>
      </div>
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        cwd={cwd}
        onCreated={() => void refresh()}
      />
      <RenameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
        file={renameTarget}
        onRenamed={() => void refresh()}
      />
      <SelectionToolbar
        selectedCount={selection.count}
        onClear={selection.clear}
        onDelete={() => void handleBulkDelete()}
        onDownload={handleBulkDownload}
      />
      <UploadDropZone onDrop={(files) => queue.enqueue(cwd, files)} />
      <UploadDrawer
        tasks={queue.tasks}
        onClearCompleted={queue.clearCompleted}
        onCancel={queue.cancel}
      />
    </AppShell>
  )
}
