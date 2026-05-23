import { useEffect, useState, type ReactNode } from 'react'

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useViewport } from '@/hooks/use-viewport'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { isMobile } = useViewport()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false)
  }, [isMobile])

  return (
    <div className="flex h-full flex-col">
      <Header showMenuButton={isMobile} onMenuClick={() => setMobileSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {!isMobile ? (
          <aside className="w-64 shrink-0 border-r">
            <Sidebar />
          </aside>
        ) : (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Primary navigation</SheetDescription>
              <Sidebar />
            </SheetContent>
          </Sheet>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
