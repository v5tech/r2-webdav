import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  onSave: (file: File, cwd: string) => boolean
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
  const [unsavedOpen, setUnsavedOpen] = useState(false)
  const isDirty = name !== DEFAULT_NAME || body !== ''

  function reset() {
    setName(DEFAULT_NAME)
    setBody('')
  }

  function handleOpenChange(next: boolean) {
    if (!next && isDirty) {
      setUnsavedOpen(true)
      return
    }
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSave() {
    const trimmedName = name.trim() || DEFAULT_NAME
    const file = new File([body], trimmedName, { type: detectMime(trimmedName) })
    if (onSave(file, cwd)) return
    onOpenChange(false)
    reset()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-6 sm:max-w-[440px] data-[side=right]:sm:max-w-[440px]"
        >
          <SheetHeader className="mb-6 p-0">
            <SheetTitle className="text-[21px] leading-normal font-semibold">
              {t('textpad.title')}
            </SheetTitle>
            <SheetDescription className="mt-1.5 text-xs">
              {t('textpad.description')}
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex flex-1 flex-col gap-[18px] px-0">
            <Field className="gap-[7px]">
              <FieldLabel htmlFor="textpad-name">{t('textpad.name')}</FieldLabel>
              <Input
                id="textpad-name"
                data-testid="textpad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                className="h-[42px] rounded-md px-3 py-2.5 text-sm leading-normal"
              />
            </Field>
            <Field className="flex flex-1 flex-col gap-[7px]">
              <FieldLabel htmlFor="textpad-body">{t('textpad.body')}</FieldLabel>
              <textarea
                id="textpad-body"
                data-testid="textpad-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                placeholder={t('textpad.placeholder')}
                className={cn(
                  'min-h-[260px] flex-1 resize-none rounded-md border border-input bg-muted/50 px-3 py-2.5 font-mono text-xs leading-normal outline-none transition-colors',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'dark:bg-input/30',
                )}
              />
            </Field>
            <div className="-mt-2.5 flex justify-between text-[11px] text-muted-foreground">
              <span>
                {t('textpad.bytes', {
                  value: new TextEncoder().encode(body).length.toLocaleString(),
                })}
              </span>
              <span>
                {detectMime(name) === 'text/markdown' ? 'Markdown' : t('textpad.textType')}
              </span>
            </div>
          </FieldGroup>
          <SheetFooter className="mt-auto flex-row justify-end gap-2.5 p-0 pt-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md bg-card px-3.5 text-[13px] font-semibold"
              onClick={() => handleOpenChange(false)}
            >
              {t('textpad.cancel')}
            </Button>
            <Button
              data-testid="textpad-save"
              className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
              onClick={handleSave}
              disabled={!body.trim() || !name.trim()}
            >
              {t('textpad.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
        <AlertDialogContent className="w-[min(480px,calc(100vw-32px))] max-w-none gap-0 rounded-2xl p-0 data-[size=default]:max-w-[calc(100vw-32px)] sm:max-w-[480px] data-[size=default]:sm:max-w-[480px]">
          <AlertDialogHeader className="place-items-start border-b px-4 py-3.5 text-left">
            <AlertDialogTitle className="text-[13px] font-semibold">
              {t('textpad.unsavedTitle')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="p-6 text-[13px] leading-[1.7]">
            {t('textpad.unsavedDescription')}
          </AlertDialogDescription>
          <AlertDialogFooter className="m-0 flex-row justify-end gap-2.5 px-[18px] py-3.5">
            <AlertDialogCancel
              className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
              onClick={() => setUnsavedOpen(false)}
            >
              {t('textpad.continue')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
              onClick={() => {
                setUnsavedOpen(false)
                reset()
                onOpenChange(false)
              }}
            >
              {t('textpad.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
