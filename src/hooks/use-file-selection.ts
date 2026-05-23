import { useCallback, useMemo, useState } from 'react'

export interface FileSelection {
  selected: ReadonlySet<string>
  count: number
  has: (key: string) => boolean
  toggle: (key: string) => void
  clear: () => void
  selectAll: (keys: string[]) => void
}

export function useFileSelection(): FileSelection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const selectAll = useCallback((keys: string[]) => {
    setSelected(new Set(keys))
  }, [])

  const has = useCallback((key: string) => selected.has(key), [selected])

  return useMemo(
    () => ({ selected, count: selected.size, has, toggle, clear, selectAll }),
    [selected, has, toggle, clear, selectAll],
  )
}
