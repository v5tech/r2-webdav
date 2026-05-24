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
    >
      <ToggleGroupItem value="grid" aria-label={t('files.view.grid')}>
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label={t('files.view.list')}>
        <ListIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
