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
              <th className="h-[38px] w-[46px] px-3.5 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                  aria-label={t('files.selectAll')}
                  className="size-7 accent-primary md:size-4"
                />
              </th>
            ) : null}
            <th className="h-[38px] px-3.5 font-medium">{t('files.sort.name')}</th>
            <th className="hidden h-[38px] w-[120px] px-3.5 font-medium sm:table-cell">
              {t('files.sort.size')}
            </th>
            <th className="hidden h-[38px] w-[204px] px-3.5 font-medium md:table-cell">
              {t('files.sort.modified')}
            </th>
            <th className="h-[38px] w-[58px] px-3.5">
              <span className="sr-only">{t('trash.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>{items.map(renderItem)}</tbody>
      </table>
    </div>
  )
}
