import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'

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

export function SortControls({ sortKey, sortDir, onSortChange }: SortControlsProps) {
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
        aria-label="Sort key"
      >
        {KEYS.map((k) => (
          <ToggleGroupItem key={k} value={k} aria-label={`Sort by ${k}`}>
            <span className="capitalize">{k}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          sortDir === 'asc' ? 'Sort direction ascending' : 'Sort direction descending'
        }
        onClick={() => onSortChange(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
      >
        {sortDir === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </Button>
    </div>
  )
}
