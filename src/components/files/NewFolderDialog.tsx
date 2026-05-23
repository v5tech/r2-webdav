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
import { createFolder } from '@/lib/webdav'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .refine((v) => !v.includes('/'), 'Folder name cannot contain /'),
})

type FormValues = z.infer<typeof schema>

interface NewFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cwd: string
  onCreated?: () => void
}

export function NewFolderDialog({
  open,
  onOpenChange,
  cwd,
  onCreated,
}: NewFolderDialogProps) {
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  function handleClose(next: boolean) {
    if (!next) {
      reset()
      setSubmitError(null)
    }
    onOpenChange(next)
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      await createFolder(`${cwd}${values.name}`)
      onCreated?.()
      handleClose(false)
    } catch {
      setSubmitError(t('files.newFolder.error.submit'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t('files.newFolder.title')}</DialogTitle>
            <DialogDescription>{t('files.newFolder.description')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              control={control}
              name="name"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="folder-name">
                    {t('files.newFolder.label')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="folder-name"
                    type="text"
                    autoComplete="off"
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              {t('files.newFolder.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('files.newFolder.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
