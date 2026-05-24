import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface TextPadDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cwd: string
  onSave: (file: File, cwd: string) => void
}

function detectMime(filename: string): string {
  if (/\.md$/i.test(filename)) return 'text/markdown'
  return 'text/plain'
}

const DEFAULT_NAME = 'note.txt'

export function TextPadDrawer({ open, onOpenChange, cwd, onSave }: TextPadDrawerProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(DEFAULT_NAME)
  const [body, setBody] = useState('')

  function handleSave() {
    const trimmedName = name.trim() || DEFAULT_NAME
    const file = new File([body], trimmedName, { type: detectMime(trimmedName) })
    onSave(file, cwd)
    onOpenChange(false)
    setName(DEFAULT_NAME)
    setBody('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('textpad.title')}</SheetTitle>
          <SheetDescription>{t('textpad.description')}</SheetDescription>
        </SheetHeader>
        <FieldGroup className="flex flex-1 flex-col gap-4 px-4">
          <Field>
            <FieldLabel htmlFor="textpad-name">{t('textpad.name')}</FieldLabel>
            <Input
              id="textpad-name"
              data-testid="textpad-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field className="flex flex-1 flex-col">
            <FieldLabel htmlFor="textpad-body">{t('textpad.body')}</FieldLabel>
            <textarea
              id="textpad-body"
              data-testid="textpad-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              placeholder={t('textpad.placeholder')}
              className={cn(
                'flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none transition-colors',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'dark:bg-input/30',
              )}
            />
          </Field>
        </FieldGroup>
        <SheetFooter>
          <Button
            data-testid="textpad-save"
            onClick={handleSave}
            disabled={!body.trim() || !name.trim()}
          >
            {t('textpad.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
