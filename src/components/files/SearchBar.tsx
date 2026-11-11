import { SearchIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchBarProps {
  value: string
  onChange: (next: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-10 w-full items-center gap-2 rounded-md border border-transparent bg-muted/50 px-[11px] text-muted-foreground focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('files.search.placeholder')}
        className="h-auto flex-1 border-0 bg-transparent px-0 py-0 pr-8 text-sm leading-normal focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1"
          onClick={() => onChange('')}
          aria-label={t('files.search.clear')}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}
