import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={t('files.sort.key')}>
            <ArrowUpDownIcon />
            <span>{t(SORT_LABEL_KEY[sortKey])}</span>
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={sortKey}
            onValueChange={(value) => {
              if (KEYS.includes(value as SortKey)) onSortChange(value as SortKey, sortDir)
            }}
          >
            {KEYS.map((key) => (
              <DropdownMenuRadioItem key={key} value={key} aria-label={t(SORT_BY_KEY[key])}>
                {t(SORT_LABEL_KEY[key])}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={sortDir === 'asc' ? t('files.sort.directionAsc') : t('files.sort.directionDesc')}
        onClick={() => onSortChange(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
      >
        {sortDir === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Button>
    </div>
  )
}
