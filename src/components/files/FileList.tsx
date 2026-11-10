import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { FileItem } from '@/lib/types'

interface FileListProps {
  items: FileItem[]
  renderItem: (item: FileItem) => ReactNode
  onSelectAll?: (checked: boolean) => void
  allSelected?: boolean
}

export function FileList({ items, renderItem, onSelectAll, allSelected = false }: FileListProps) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            {onSelectAll ? (
              <th className="w-11 px-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                  aria-label={t('files.selectAll')}
                  className="size-7 accent-primary md:size-4"
                />
              </th>
            ) : null}
            <th className="font-medium">{t('files.sort.name')}</th>
            <th className="hidden w-24 font-medium sm:table-cell">{t('files.sort.size')}</th>
            <th className="hidden w-52 font-medium md:table-cell">{t('files.sort.modified')}</th>
            <th className="w-12">
              <span className="sr-only">{t('trash.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>{items.map(renderItem)}</tbody>
      </table>
    </div>
  )
}
