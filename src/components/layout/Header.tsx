import { GlobeIcon, LogOutIcon, MenuIcon, MoonIcon, SunIcon, UploadIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type Theme,
} from '@/lib/theme'

interface HeaderProps {
  showMenuButton: boolean
  onMenuClick: () => void
  onUpload?: (files: File[]) => void
}

export function Header({ showMenuButton, onMenuClick, onUpload }: HeaderProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // proceed to /login regardless of logout outcome
    }
    navigate('/login', { replace: true })
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length && onUpload) onUpload(files)
    e.target.value = ''
  }

  function handleThemeChange(next: string) {
    const value = next as Theme
    setTheme(value)
    setStoredTheme(value)
    applyTheme(resolveTheme(value))
  }

  function handleLanguageChange(next: string) {
    void i18n.changeLanguage(next)
  }

  const resolvedTheme = resolveTheme(theme)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      {showMenuButton ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          aria-label={t('nav.openMenu')}
        >
          <MenuIcon />
        </Button>
      ) : null}
      <img src="/logo144.png" alt="FlareDrive" className="size-7" />
      <div className="flex-1" />
      {onUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handlePick}
            data-testid="upload-input"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => inputRef.current?.click()}
            aria-label={t('files.upload.button')}
          >
            <UploadIcon />
          </Button>
        </>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('header.theme.toggle')}>
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
            <DropdownMenuRadioItem value="light">{t('header.theme.light')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">{t('header.theme.dark')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">{t('header.theme.system')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('header.language.toggle')}>
            <GlobeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
            onValueChange={handleLanguageChange}
          >
            <DropdownMenuRadioItem value="zh">{t('header.language.zh')}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en">{t('header.language.en')}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleLogout}
        aria-label={t('nav.logout')}
      >
        <LogOutIcon />
      </Button>
    </header>
  )
}
