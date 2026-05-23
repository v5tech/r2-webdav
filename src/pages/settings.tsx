import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  setStoredTheme,
  type Theme,
} from '@/lib/theme'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  function handleThemeChange(next: string) {
    if (next !== 'light' && next !== 'dark' && next !== 'system') return
    setTheme(next)
    setStoredTheme(next)
    applyTheme(resolveTheme(next))
  }

  function handleLanguageChange(next: string) {
    if (!next) return
    void i18n.changeLanguage(next)
  }

  const currentLang = i18n.language.startsWith('zh') ? 'zh' : 'en'

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3 text-lg font-medium">
          {t('settings.title')}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.theme.title')}</CardTitle>
              <CardDescription>{t('settings.theme.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={handleThemeChange}
                aria-label={t('settings.theme.title')}
              >
                <ToggleGroupItem value="light">{t('header.theme.light')}</ToggleGroupItem>
                <ToggleGroupItem value="dark">{t('header.theme.dark')}</ToggleGroupItem>
                <ToggleGroupItem value="system">{t('header.theme.system')}</ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
            <CardHeader>
              <CardTitle>{t('settings.language.title')}</CardTitle>
              <CardDescription>{t('settings.language.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup
                type="single"
                value={currentLang}
                onValueChange={handleLanguageChange}
                aria-label={t('settings.language.title')}
              >
                <ToggleGroupItem value="zh">{t('header.language.zh')}</ToggleGroupItem>
                <ToggleGroupItem value="en">{t('header.language.en')}</ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
