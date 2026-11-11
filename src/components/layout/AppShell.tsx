import { FolderIcon, SettingsIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useViewport } from '@/hooks/use-viewport'
import { cn } from '@/lib/utils'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation()
  const { isMobile } = useViewport()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('r2_sidebar_collapsed') === '1',
  )

  useEffect(() => {
    localStorage.setItem('r2_sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  if (!isMobile && mobileSidebarOpen) {
    setMobileSidebarOpen(false)
  }

  const links = [
    { to: '/files', label: t('nav.files'), icon: FolderIcon },
    { to: '/trash', label: t('nav.trash'), icon: Trash2Icon },
    { to: '/settings', label: t('nav.settings'), icon: SettingsIcon },
  ]

  return (
    <div
      className={cn(
        'h-dvh overflow-hidden md:grid md:grid-cols-[216px_minmax(0,1fr)] md:transition-[grid-template-columns] md:duration-200 lg:grid-cols-[240px_minmax(0,1fr)]',
        collapsed && 'md:grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,1fr)]',
      )}
      data-collapsed={collapsed}
    >
      {!isMobile ? (
        <aside className="flex min-h-0 flex-col border-r bg-card px-4 pt-6 pb-[18px]">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        </aside>
      ) : (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
            <SheetDescription className="sr-only">{t('nav.primary')}</SheetDescription>
            <Sidebar
              collapsed={false}
              showCollapse={false}
              onToggle={() => {}}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}
      <div className="flex h-dvh min-h-0 min-w-0 flex-col md:h-auto">
        <Header showMenuButton={isMobile} onMenuClick={() => setMobileSidebarOpen(true)} />
        <main className={`min-h-0 flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
          {children}
        </main>
      </div>
      {isMobile ? (
        <nav
          aria-label={t('nav.mobile')}
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-card px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        >
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="size-[19px]" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
