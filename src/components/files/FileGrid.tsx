import type { ReactNode } from 'react'

import type { FileItem } from '@/lib/types'

interface FileGridProps {
  items: FileItem[]
  renderItem: (item: FileItem) => ReactNode
}

export function FileGrid({ items, renderItem }: FileGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-3">
      {items.map(renderItem)}
    </div>
  )
}
