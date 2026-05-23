import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface UploadDropZoneProps {
  onDrop: (files: File[]) => void
}

function hasFiles(event: Event): boolean {
  const dt = (event as DragEvent).dataTransfer
  return dt?.types?.includes('Files') ?? false
}

export function UploadDropZone({ onDrop }: UploadDropZoneProps) {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)
  const counter = useRef(0)

  useEffect(() => {
    function handleDragEnter(e: Event) {
      if (!hasFiles(e)) return
      e.preventDefault()
      counter.current += 1
      setActive(true)
    }
    function handleDragLeave() {
      counter.current = Math.max(0, counter.current - 1)
      if (counter.current === 0) setActive(false)
    }
    function handleDragOver(e: Event) {
      if (!hasFiles(e)) return
      e.preventDefault()
    }
    function handleDrop(e: Event) {
      if (!hasFiles(e)) return
      e.preventDefault()
      counter.current = 0
      setActive(false)
      const files = (e as DragEvent).dataTransfer?.files
      if (files && files.length > 0) {
        onDrop(Array.from(files))
      }
    }
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [onDrop])

  if (!active) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="rounded-lg border-2 border-dashed border-primary p-12 text-center">
        <p className="text-lg font-medium">{t('files.upload.dropHere')}</p>
      </div>
    </div>
  )
}
