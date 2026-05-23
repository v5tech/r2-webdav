import { useCallback, useEffect, useRef, useState } from 'react'

import { uploadFile as defaultUploadFile, type UploadProgress } from '@/lib/webdav'

export interface UploadTask {
  id: string
  file: File
  cwd: string
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  loaded: number
  total: number
  error?: string
}

export interface UseUploadQueueOptions {
  onCompleted?: (task: UploadTask) => void
  upload?: (
    key: string,
    file: File,
    onProgress: UploadProgress,
    signal: AbortSignal,
  ) => Promise<void>
}

export interface UploadQueue {
  tasks: UploadTask[]
  enqueue: (cwd: string, files: File[]) => void
  clearCompleted: () => void
  cancel: (id: string) => void
}

export function useUploadQueue(options: UseUploadQueueOptions = {}): UploadQueue {
  const { onCompleted, upload = defaultUploadFile } = options
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const processing = useRef(false)
  const onCompletedRef = useRef(onCompleted)
  onCompletedRef.current = onCompleted
  const controllers = useRef<Map<string, AbortController>>(new Map())

  const enqueue = useCallback((cwd: string, files: File[]) => {
    setTasks((prev) => [
      ...prev,
      ...files.map<UploadTask>((file) => ({
        id: crypto.randomUUID(),
        file,
        cwd,
        status: 'pending',
        loaded: 0,
        total: file.size,
      })),
    ])
  }, [])

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'))
  }, [])

  const cancel = useCallback((id: string) => {
    const controller = controllers.current.get(id)
    if (controller) controller.abort()
    controllers.current.delete(id)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id && (t.status === 'pending' || t.status === 'uploading')
          ? { ...t, status: 'cancelled' as const }
          : t,
      ),
    )
  }, [])

  useEffect(() => {
    if (processing.current) return
    const next = tasks.find((t) => t.status === 'pending')
    if (!next) return
    processing.current = true
    const controller = new AbortController()
    controllers.current.set(next.id, controller)
    setTasks((prev) =>
      prev.map((t) => (t.id === next.id ? { ...t, status: 'uploading' } : t)),
    )
    upload(
      next.cwd + next.file.name,
      next.file,
      (loaded, total) => {
        setTasks((prev) => prev.map((t) => (t.id === next.id ? { ...t, loaded, total } : t)))
      },
      controller.signal,
    )
      .then(() => {
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === next.id && t.status === 'uploading'
              ? { ...t, status: 'completed' as const, loaded: t.total }
              : t,
          )
          const completed = updated.find((t) => t.id === next.id)
          if (completed?.status === 'completed') onCompletedRef.current?.(completed)
          return updated
        })
        controllers.current.delete(next.id)
        processing.current = false
      })
      .catch((err: Error) => {
        const aborted = controller.signal.aborted || err.name === 'AbortError'
        setTasks((prev) =>
          prev.map((t) =>
            t.id === next.id
              ? aborted
                ? { ...t, status: 'cancelled' as const }
                : { ...t, status: 'failed' as const, error: err.message }
              : t,
          ),
        )
        controllers.current.delete(next.id)
        processing.current = false
      })
  }, [tasks, upload])

  return { tasks, enqueue, clearCompleted, cancel }
}
