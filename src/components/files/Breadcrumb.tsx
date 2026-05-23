import { HomeIcon } from 'lucide-react'
import { Fragment } from 'react'

import { Button } from '@/components/ui/button'

interface BreadcrumbProps {
  cwd: string
  onCwdChange: (cwd: string) => void
}

export function Breadcrumb({ cwd, onCwdChange }: BreadcrumbProps) {
  const trimmed = cwd.replace(/\/$/, '')
  const segments = trimmed ? trimmed.split('/') : []

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 p-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Home"
        onClick={() => onCwdChange('')}
      >
        <HomeIcon />
      </Button>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const prefix = segments.slice(0, index + 1).join('/') + '/'
        return (
          <Fragment key={index}>
            <span className="text-muted-foreground" aria-hidden="true">
              /
            </span>
            {isLast ? (
              <span className="px-2 text-sm font-medium">{segment}</span>
            ) : (
              <Button variant="link" size="sm" onClick={() => onCwdChange(prefix)}>
                {segment}
              </Button>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
