import type { ReactNode } from 'react'

import type { FileItem } from '@/lib/types'

interface FileGridProps {
  items: FileItem[]
  renderItem: (item: FileItem) => ReactNode
}

export function FileGrid({ items, renderItem }: FileGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-2.5 p-3 md:gap-3.5 md:p-4">
      {items.map(renderItem)}
    </div>
  )
}
