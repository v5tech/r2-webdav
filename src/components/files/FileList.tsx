import type { ReactNode } from 'react'

import type { FileItem } from '@/lib/types'

interface FileListProps {
  items: FileItem[]
  renderItem: (item: FileItem) => ReactNode
}

export function FileList({ items, renderItem }: FileListProps) {
  return <div className="flex flex-col">{items.map(renderItem)}</div>
}
