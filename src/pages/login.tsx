import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loginSchema = z.object({
    username: z.string().min(1, t('login.validation.usernameRequired')),
    password: z.string().min(1, t('login.validation.passwordRequired')),
  })

  type LoginValues = z.infer<typeof loginSchema>

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        navigate('/', { replace: true })
        return
      }
      setSubmitError(
        res.status === 401
          ? t('login.error.invalidCredentials')
          : t('login.error.generic', { status: res.status }),
      )
    } catch {
      setSubmitError(t('login.error.network'))
    }
  }

  return (
    <main className="login-page flex min-h-full items-center justify-center p-6">
      <section
        aria-labelledby="login-title"
        className="login-card w-full max-w-[420px] rounded-[14px] border bg-card p-7 text-sm text-card-foreground sm:p-8"
      >
        <div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <img src="/logo144.png" alt="R2 WebDAV" className="size-6" />
            </span>
            <span>
              <span className="block text-sm leading-normal font-semibold tracking-tight">
                {t('nav.brand')}
              </span>
              <span className="block text-[11px] leading-normal text-muted-foreground">
                {t('nav.personalSpace')}
              </span>
            </span>
          </div>
          <h1
            id="login-title"
            className="text-[28px] leading-[42px] font-bold tracking-[-0.04em]"
          >
            {t('login.title')}
          </h1>
          <p className="mt-2 mb-[30px] text-[13px] leading-normal text-muted-foreground">
            {t('login.description')}
          </p>
        </div>
        {submitError ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {submitError}
          </div>
        ) : null}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup className="gap-[18px]">
            <Controller
              control={control}
              name="username"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <Field className="gap-[7px]" data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel className="text-xs leading-normal font-medium" htmlFor="username">
                    {t('login.username')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder={t('login.usernamePlaceholder')}
                    required
                    className="h-[42px] rounded-md px-3 py-2.5 text-sm leading-normal"
                    aria-invalid={fieldState.invalid || undefined}
                  />
                  {fieldState.error?.message ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { ref: _ref, ...field }, fieldState }) => (
                <Field className="gap-[7px]" data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel className="text-xs leading-normal font-medium" htmlFor="password">
                    {t('login.password')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('login.passwordPlaceholder')}
                    required
                    className="h-[42px] rounded-md px-3 py-2.5 text-sm leading-normal"
                    aria-invalid={fieldState.invalid || undefined}
                  />
                  {fieldState.error?.message ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : null}
                </Field>
              )}
            />
          </FieldGroup>
          <Button
            type="submit"
            className="mt-6 h-10 w-full rounded-md px-3.5 text-[13px] leading-normal font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
        <div className="mt-5 flex items-start gap-2 text-[11px] leading-[1.6] text-muted-foreground">
          <ShieldCheckIcon className="mt-px size-[15px] shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t('login.security')}</span>
        </div>
      </section>
    </main>
  )
}
