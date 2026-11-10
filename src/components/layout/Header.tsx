import { GlobeIcon, MenuIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { applyTheme, getStoredTheme, resolveTheme, setStoredTheme, type Theme } from '@/lib/theme'

interface HeaderProps {
  showMenuButton: boolean
  onMenuClick: () => void
}

export function Header({ showMenuButton, onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())
  const resolvedTheme = resolveTheme(theme)
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

  function handleThemeToggle() {
    setTheme(nextTheme)
    setStoredTheme(nextTheme)
    applyTheme(nextTheme)
  }

  function handleLanguageChange(next: string) {
    void i18n.changeLanguage(next)
  }

  return (
    <header
      className={`flex h-14 shrink-0 items-center border-b bg-card px-4 md:px-7 ${
        showMenuButton ? 'justify-between' : 'justify-end'
      }`}
    >
      {showMenuButton ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            aria-label={t('nav.openMenu')}
          >
            <MenuIcon />
          </Button>
          <img src="/logo144.png" alt="R2 WebDAV" className="size-6" />
          <span className="text-sm font-semibold tracking-tight">{t('nav.brand')}</span>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleThemeToggle}
          aria-label={t(`header.theme.to${nextTheme === 'dark' ? 'Dark' : 'Light'}`)}
          title={t(`header.theme.to${nextTheme === 'dark' ? 'Dark' : 'Light'}`)}
        >
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('header.language.toggle')}>
              <GlobeIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup
              value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
              onValueChange={handleLanguageChange}
            >
              <DropdownMenuRadioItem value="zh">{t('header.language.zh')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">{t('header.language.en')}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
