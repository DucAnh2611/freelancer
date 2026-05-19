import { LabelRequire } from '@/components/label-require'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useText } from '@/hooks/use-text'
import { createEmployeeAccount, type CreateEmployeeResult } from '@/services/profiles'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Fires after the account is created and credentials have been copied. Used
  // by callers that need to auto-select the new employee in a parent form.
  onCreated?: (result: CreateEmployeeResult) => void
}

export function CreateEmployeeDialog({ open, onOpenChange, onCreated }: Props) {
  const { text } = useText()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setEmail('')
    setError(null)
    setBusy(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setError(text.page.employees.emailRequired)
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError(text.page.employees.emailInvalid)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await createEmployeeAccount(trimmed)
      const line = `${result.email} / ${result.password}`
      let copied = true
      try {
        await navigator.clipboard.writeText(line)
      } catch {
        copied = false
      }
      toast.success(
        copied ? text.page.employees.createdToast : text.page.employees.clipboardFailed,
        { description: line },
      )
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      onCreated?.(result)
      onOpenChange(false)
      reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : text.page.employees.createFailed
      setError(
        /already|registered|exists/i.test(msg) ? text.page.employees.emailTaken : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{text.page.employees.newEmployeeTitle}</DialogTitle>
          <DialogDescription>{text.page.employees.newEmployeeDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-3">
            <Field data-invalid={Boolean(error)}>
              <LabelRequire htmlFor="create-employee-email">
                {text.page.employees.fieldEmail}
              </LabelRequire>
              <Input
                id="create-employee-email"
                type="email"
                autoComplete="off"
                autoFocus
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder={text.page.employees.fieldEmailPlaceholder}
                aria-invalid={Boolean(error)}
              />
              {error && <FieldError errors={[{ message: error }]} />}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {text.page.employees.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? text.page.employees.creating : text.page.employees.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
