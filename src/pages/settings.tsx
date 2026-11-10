import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { applyTheme, getStoredTheme, resolveTheme, setStoredTheme, type Theme } from '@/lib/theme'

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
      <div className="px-5 py-6 md:px-8 md:py-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('settings.description')}</p>
        <Card className="mt-6 max-w-3xl gap-0 py-0">
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.theme.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={handleThemeChange}
              aria-label={t('settings.theme.title')}
              className="grid grid-cols-3 gap-3"
            >
              {(['light', 'dark', 'system'] as Theme[]).map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex h-auto flex-col items-stretch gap-2 rounded-lg border px-2 py-2 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-12 rounded-md border ${
                      value === 'light'
                        ? 'border-slate-200 bg-slate-100'
                        : value === 'dark'
                          ? 'border-slate-700 bg-slate-900'
                          : 'border-slate-300 bg-[linear-gradient(110deg,#f3f5f7_50%,#0f161c_50%)]'
                    }`}
                  />
                  <span className="px-1 text-xs font-medium">{t(`header.theme.${value}`)}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
          <div className="border-t" />
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
    </AppShell>
  )
}
