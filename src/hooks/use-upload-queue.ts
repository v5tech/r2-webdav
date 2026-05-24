import { useCallback, useEffect, useRef, useState } from 'react'

import { generateImageThumbnail, uploadThumbnail } from '@/lib/thumbnail'
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
    thumbnailHash?: string,
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
  useEffect(() => {
    onCompletedRef.current = onCompleted
  })
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

  /* eslint-disable react-hooks/set-state-in-effect -- 上传队列调度器: tasks 变化触发 effect 推进状态机 (pending→uploading→completed/failed/cancelled), 不是简单 prop→state 派生 */
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
    void (async () => {
      let thumbnailHash: string | undefined
      if (next.file.type.startsWith('image/')) {
        try {
          const { blob, hash } = await generateImageThumbnail(next.file)
          await uploadThumbnail(blob, hash, controller.signal)
          thumbnailHash = hash
        } catch {
          // 静默跳过：thumbnail 是次要功能，不阻塞主上传
        }
      }
      upload(
        next.cwd + next.file.name,
        next.file,
        (loaded, total) => {
          setTasks((prev) => prev.map((t) => (t.id === next.id ? { ...t, loaded, total } : t)))
        },
        controller.signal,
        thumbnailHash,
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
    })()
  }, [tasks, upload])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { tasks, enqueue, clearCompleted, cancel }
}
