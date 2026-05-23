import { useCallback, useEffect, useRef, useState } from 'react'

import { uploadFile as defaultUploadFile, type UploadProgress } from '@/lib/webdav'

export interface UploadTask {
  id: string
  file: File
  cwd: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  loaded: number
  total: number
  error?: string
}

export interface UseUploadQueueOptions {
  onCompleted?: (task: UploadTask) => void
  upload?: (key: string, file: File, onProgress: UploadProgress) => Promise<void>
}

export interface UploadQueue {
  tasks: UploadTask[]
  enqueue: (cwd: string, files: File[]) => void
  clearCompleted: () => void
}

export function useUploadQueue(options: UseUploadQueueOptions = {}): UploadQueue {
  const { onCompleted, upload = defaultUploadFile } = options
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const processing = useRef(false)
  const onCompletedRef = useRef(onCompleted)
  onCompletedRef.current = onCompleted

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

  useEffect(() => {
    if (processing.current) return
    const next = tasks.find((t) => t.status === 'pending')
    if (!next) return
    processing.current = true
    setTasks((prev) =>
      prev.map((t) => (t.id === next.id ? { ...t, status: 'uploading' } : t)),
    )
    upload(next.cwd + next.file.name, next.file, (loaded, total) => {
      setTasks((prev) => prev.map((t) => (t.id === next.id ? { ...t, loaded, total } : t)))
    })
      .then(() => {
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === next.id
              ? { ...t, status: 'completed' as const, loaded: t.total }
              : t,
          )
          const completed = updated.find((t) => t.id === next.id)
          if (completed) onCompletedRef.current?.(completed)
          return updated
        })
        processing.current = false
      })
      .catch((err: Error) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === next.id ? { ...t, status: 'failed' as const, error: err.message } : t,
          ),
        )
        processing.current = false
      })
  }, [tasks, upload])

  return { tasks, enqueue, clearCompleted }
}
