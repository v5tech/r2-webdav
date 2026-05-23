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
    <div className="relative flex items-center">
      <SearchIcon className="absolute left-2.5 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('files.search.placeholder')}
        className="pl-8 pr-8"
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
