import {
  ChevronDownIcon,
  FolderIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  Trash2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  showCollapse?: boolean
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, onNavigate, showCollapse = true }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { username } = useAuth()
  const displayName = username ?? t('nav.accountFallback')

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      // Logout locally even when the network request fails.
    }
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  const links = [
    { to: '/files', label: t('nav.allFiles'), icon: FolderIcon },
    { to: '/trash', label: t('nav.trash'), icon: Trash2Icon },
    { to: '/settings', label: t('nav.settings'), icon: SettingsIcon },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex h-9 items-center justify-between">
        {collapsed ? (
          <button
            type="button"
            className="group relative flex size-9 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={onToggle}
            aria-label={t('nav.expand')}
          >
            <span className="flex size-9 items-center justify-center rounded-[9px] border border-primary/25 bg-primary/10">
              <img src="/logo144.png" alt="R2 WebDAV" className="size-6" />
            </span>
            <PanelLeftOpenIcon className="absolute -right-1 -bottom-1 size-4 rounded-md border bg-card p-0.5 text-muted-foreground group-hover:text-primary group-focus-visible:text-primary" />
            <span
              role="tooltip"
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {t('nav.expand')}
            </span>
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-[11px] px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-primary/25 bg-primary/10">
                <img src="/logo144.png" alt="R2 WebDAV" className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] leading-[1.2] font-semibold tracking-[-0.02em]">
                  {t('nav.brand')}
                </span>
                <span className="mt-[3px] block text-[11px] leading-normal text-muted-foreground">
                  {t('nav.personalSpace')}
                </span>
              </span>
            </div>
            {showCollapse ? (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-md"
                onClick={onToggle}
                aria-label={t('nav.collapse')}
                title={t('nav.collapse')}
              >
                <PanelLeftCloseIcon />
              </Button>
            ) : null}
          </>
        )}
      </div>

      <nav aria-label="primary" className="grid gap-[5px]">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            data-tooltip={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex min-h-[42px] items-center gap-[11px] rounded-md px-3 text-sm transition-colors ${
                collapsed ? 'justify-center px-0 before:-left-2.5' : 'before:-left-4'
              } ${
                isActive
                  ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-[3px] before:bg-primary before:content-[\'\']'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="size-[18px] shrink-0" />
            <span className={collapsed ? 'sr-only' : ''}>{label}</span>
            {collapsed ? (
              <span
                role="tooltip"
                aria-hidden="true"
                className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {label}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className={`mt-auto border-t pt-[18px] ${collapsed ? 'px-0' : 'px-2'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`group relative flex min-h-10 w-full items-center gap-2.5 rounded-md p-1 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              aria-label={t('nav.account')}
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-normal font-semibold">
                      {displayName}
                    </span>
                    <span className="mt-px block text-[11px] leading-normal text-muted-foreground">
                      {t('nav.owner')}
                    </span>
                  </span>
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </>
              ) : null}
              {collapsed ? (
                <span
                  role="tooltip"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {t('nav.account')}
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={collapsed ? 'right' : 'top'}
            align="end"
            sideOffset={12}
            className="w-52"
          >
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">{displayName}</span>
              <span className="block text-[11px] font-normal text-muted-foreground">
                {t('nav.owner')}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/settings" onClick={onNavigate}>
                <SettingsIcon />
                {t('nav.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOutIcon />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
