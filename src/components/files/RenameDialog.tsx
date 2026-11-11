import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { FileItem } from '@/lib/types'
import { isDirectory, moveFile } from '@/lib/webdav'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .refine((v) => !v.includes('/'), 'Name cannot contain /'),
})

type FormValues = z.infer<typeof schema>

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  onRenamed?: () => void
}

function splitParent(key: string): { parent: string; name: string } {
  const trimmed = key.replace(/\/$/, '')
  const lastSep = trimmed.lastIndexOf('/')
  if (lastSep < 0) return { parent: '', name: trimmed }
  return { parent: trimmed.slice(0, lastSep + 1), name: trimmed.slice(lastSep + 1) }
}

interface RenameFormProps {
  file: FileItem
  onRenamed?: () => void
  onClose: () => void
}

// 受 key={file.key} 控制重挂; file 切换时所有内部 state (form + submitError) 自然重置
function RenameForm({ file, onRenamed, onClose }: RenameFormProps) {
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initial = splitParent(file.key)
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial.name },
  })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    const dir = isDirectory(file)
    const target = `${initial.parent}${values.name}${dir ? '/' : ''}`
    try {
      await moveFile(file.key, target)
      onRenamed?.()
      onClose()
    } catch {
      setSubmitError(t('files.rename.error.submit'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <DialogHeader className="border-b px-4 py-3.5">
        <DialogTitle>{t('files.rename.title')}</DialogTitle>
        <DialogDescription>{t('files.rename.description')}</DialogDescription>
      </DialogHeader>
      <FieldGroup className="p-6">
        <Controller
          control={control}
          name="name"
          render={({ field: { ref: _ref, ...field }, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="rename-name">
                {t('files.rename.label')}
              </FieldLabel>
              <Input
                {...field}
                id="rename-name"
                type="text"
                autoComplete="off"
                className="h-[42px] rounded-md px-3 py-2.5 text-sm leading-normal"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.error?.message ? (
                <FieldError>{fieldState.error.message}</FieldError>
              ) : null}
            </Field>
          )}
        />
        {submitError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}
      </FieldGroup>
      <DialogFooter className="m-0 flex-row flex-wrap justify-end px-[18px] py-3.5">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md bg-card px-3.5 text-[13px] font-semibold"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {t('files.rename.cancel')}
        </Button>
        <Button
          type="submit"
          className="h-10 rounded-md px-3.5 text-[13px] font-semibold"
          disabled={isSubmitting}
        >
          {t('files.rename.confirm')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function RenameDialog({ open, onOpenChange, file, onRenamed }: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(480px,calc(100vw-32px))] max-w-none gap-0 rounded-2xl p-0 sm:max-w-[480px]">
        {file ? (
          <RenameForm
            key={file.key}
            file={file}
            onRenamed={onRenamed}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
