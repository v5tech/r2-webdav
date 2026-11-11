import { ChevronRightIcon } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

interface BreadcrumbProps {
  cwd: string
  onCwdChange: (cwd: string) => void
}

const crumbButtonClass =
  'rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function Breadcrumb({ cwd, onCwdChange }: BreadcrumbProps) {
  const { t } = useTranslation()
  const trimmed = cwd.replace(/\/$/, '')
  const segments = trimmed ? trimmed.split('/') : []

  return (
    <nav
      aria-label="breadcrumb"
      className="mb-1.5 flex flex-wrap items-center gap-[5px] text-xs leading-4"
    >
      <button type="button" className={crumbButtonClass} onClick={() => onCwdChange('')}>
        {t('nav.allFiles')}
      </button>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const prefix = segments.slice(0, index + 1).join('/') + '/'
        return (
          <Fragment key={index}>
            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {isLast ? (
              <span aria-current="page" className="font-semibold text-foreground">
                {segment}
              </span>
            ) : (
              <button
                type="button"
                className={crumbButtonClass}
                onClick={() => onCwdChange(prefix)}
              >
                {segment}
              </button>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
