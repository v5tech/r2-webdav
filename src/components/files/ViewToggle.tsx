import { LayoutGridIcon, ListIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const { t } = useTranslation()
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => {
        if (v === 'grid' || v === 'list') onViewChange(v)
      }}
      aria-label={t('files.view.title')}
      className="rounded-md border bg-muted/50 p-0.5"
    >
      <ToggleGroupItem
        value="grid"
        aria-label={t('files.view.grid')}
        className="h-10 w-10 min-w-10 rounded-[6px] px-0 md:h-[30px] md:w-8 md:min-w-8 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label={t('files.view.list')}
        className="h-10 w-10 min-w-10 rounded-[6px] px-0 md:h-[30px] md:w-8 md:min-w-8 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        <ListIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
