import { FolderIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function Sidebar() {
  const { t } = useTranslation()
  return (
    <nav aria-label="primary" className="flex flex-col gap-1 p-4">
      <Link
        to="/files"
        className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
      >
        <FolderIcon className="size-4" />
        {t('nav.files')}
      </Link>
      <Link
        to="/trash"
        className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
      >
        <Trash2Icon className="size-4" />
        {t('nav.trash')}
      </Link>
    </nav>
  )
}
