import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
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
      <div className="mx-auto min-h-full w-full max-w-[1440px] px-4 pt-5 pb-7 md:px-8 md:pt-[22px] md:pb-12">
        <div className="mb-[18px]">
          <h1 className="text-[clamp(25px,2.4vw,31px)] leading-[1.2] font-semibold tracking-[-0.035em]">
            {t('settings.title')}
          </h1>
          <p className="mt-[7px] text-[13px] leading-normal text-muted-foreground">
            {t('settings.description')}
          </p>
        </div>
        <section
          aria-label={t('settings.title')}
          className="max-w-[900px] overflow-hidden rounded-[14px] border bg-card"
        >
          <section className="p-[18px] md:p-6">
            <h2 className="text-[15px] font-medium">{t('settings.appearance')}</h2>
            <p className="mt-[5px] mb-[18px] text-xs text-muted-foreground">
              {t('settings.theme.description')}
            </p>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={handleThemeChange}
              aria-label={t('settings.theme.title')}
              className="grid grid-cols-3 gap-[7px] md:gap-3"
            >
              {(['light', 'dark', 'system'] as Theme[]).map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex h-auto flex-col items-stretch gap-0 rounded-[10px] border bg-muted/50 p-3 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  <span
                    aria-hidden="true"
                    className={`mb-2 block h-12 rounded-md border ${
                      value === 'light'
                        ? 'border-slate-200 bg-[linear-gradient(90deg,#15232e_30%,#f3f5f7_30%)]'
                        : value === 'dark'
                          ? 'border-slate-700 bg-[linear-gradient(90deg,#0b1218_30%,#151f27_30%)]'
                          : 'border-slate-300 bg-[linear-gradient(110deg,#f3f5f7_50%,#0f161c_50%)]'
                    }`}
                  />
                  <span className="text-xs font-medium">{t(`header.theme.${value}`)}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
          <section className="border-t p-[18px] md:p-6">
            <h2 className="text-[15px] font-medium">{t('settings.language.title')}</h2>
            <p className="mt-[5px] mb-[18px] text-xs text-muted-foreground">
              {t('settings.language.description')}
            </p>
            <ToggleGroup
              type="single"
              value={currentLang}
              onValueChange={handleLanguageChange}
              aria-label={t('settings.language.title')}
              className="flex w-full gap-[3px] rounded-[9px] border bg-muted/50 p-[3px] sm:w-fit"
            >
              <ToggleGroupItem
                value="zh"
                className="h-auto min-w-0 flex-1 rounded-md px-3.5 py-2 text-xs sm:min-w-[110px] sm:flex-none data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground"
              >
                {t('header.language.zh')}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="en"
                className="h-auto min-w-[110px] rounded-md px-3.5 py-2 text-xs data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground"
              >
                {t('header.language.en')}
              </ToggleGroupItem>
            </ToggleGroup>
          </section>
        </section>
      </div>
    </AppShell>
  )
}
