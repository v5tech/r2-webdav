import { LogOutIcon, MenuIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface HeaderProps {
  showMenuButton: boolean
  onMenuClick: () => void
}

export function Header({ showMenuButton, onMenuClick }: HeaderProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // proceed to /login regardless of logout outcome
    }
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      {showMenuButton ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <MenuIcon />
        </Button>
      ) : null}
      <img src="/logo144.png" alt="FlareDrive" className="size-7" />
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleLogout}
        aria-label="Logout"
      >
        <LogOutIcon />
      </Button>
    </header>
  )
}
