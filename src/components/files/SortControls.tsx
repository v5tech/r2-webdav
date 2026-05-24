import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type SortKey = 'name' | 'size' | 'modified'
export type SortDir = 'asc' | 'desc'

interface SortControlsProps {
  sortKey: SortKey
  sortDir: SortDir
  onSortChange: (key: SortKey, dir: SortDir) => void
}

const KEYS: SortKey[] = ['name', 'size', 'modified']

const SORT_BY_KEY: Record<SortKey, string> = {
  name: 'files.sort.byName',
  size: 'files.sort.bySize',
  modified: 'files.sort.byModified',
}

const SORT_LABEL_KEY: Record<SortKey, string> = {
  name: 'files.sort.name',
  size: 'files.sort.size',
  modified: 'files.sort.modified',
}

export function SortControls({ sortKey, sortDir, onSortChange }: SortControlsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        value={sortKey}
        size="sm"
        onValueChange={(v) => {
          if (v === 'name' || v === 'size' || v === 'modified') {
            onSortChange(v, sortDir)
          }
        }}
        aria-label={t('files.sort.key')}
      >
        {KEYS.map((k) => (
          <ToggleGroupItem key={k} value={k} aria-label={t(SORT_BY_KEY[k])}>
            <span>{t(SORT_LABEL_KEY[k])}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          sortDir === 'asc' ? t('files.sort.directionAsc') : t('files.sort.directionDesc')
        }
        onClick={() => onSortChange(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
      >
        {sortDir === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Button>
    </div>
  )
}
