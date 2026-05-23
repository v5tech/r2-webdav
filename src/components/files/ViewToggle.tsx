import { LayoutGridIcon, ListIcon } from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => {
        if (v === 'grid' || v === 'list') onViewChange(v)
      }}
      aria-label="View mode"
    >
      <ToggleGroupItem value="grid" aria-label="Grid view">
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view">
        <ListIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
