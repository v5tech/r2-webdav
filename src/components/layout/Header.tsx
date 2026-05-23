import { LogOutIcon, MenuIcon, UploadIcon } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

interface HeaderProps {
  showMenuButton: boolean
  onMenuClick: () => void
  onUpload?: (files: File[]) => void
}

export function Header({ showMenuButton, onMenuClick, onUpload }: HeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

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

