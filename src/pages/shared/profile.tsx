import { LabelRequire } from '@/components/label-require'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/use-auth'
import { usePageHeader } from '@/hooks/use-page-header'
import { useText } from '@/hooks/use-text'
import { useWindowTitle } from '@/hooks/use-window-title'
import { Eye, EyeOff, KeyRound, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { text } = useText()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Change password state.
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwShow, setPwShow] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaving, setPwSaving] = useState(false)

  useWindowTitle(text.page.profile.title)

  useEffect(() => {
    setHeader({ title: text.page.profile.title })
    return () => setHeader(null)
  }, [setHeader, text.page.profile.title])

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : text.page.profile.signOutFailed)
      setSigningOut(false)
    }
  }

  function resetPwDialog() {
    setPw('')
    setPwConfirm('')
    setPwShow(false)
    setPwError(null)
    setPwSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 6) {
      setPwError(text.page.profile.passwordTooShort)
      return
    }
    if (pw !== pwConfirm) {
      setPwError(text.page.profile.passwordMismatch)
      return
    }
    setPwError(null)
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      toast.success(text.page.profile.changePasswordSuccess)
      setPwOpen(false)
      resetPwDialog()
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : text.page.profile.changePasswordFailed,
      )
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {profile && (
        <div className="space-y-0.5">
          <p className="font-medium">{profile.full_name || '(no name)'}</p>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        </div>
      )}

      <Button
        variant="outline"
        className="justify-start"
        onClick={() => setPwOpen(true)}
      >
        <KeyRound className="size-4" />
        {text.page.profile.changePassword}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={<Button variant="destructive" className="mt-auto w-full" />}
        >
          <LogOut className="size-4" />
          {text.page.profile.signOut}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.page.profile.signOutConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {text.page.profile.signOutConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>
              {text.page.profile.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? text.page.profile.signingOut : text.page.profile.signOut}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={pwOpen}
        onOpenChange={(v) => {
          setPwOpen(v)
          if (!v) resetPwDialog()
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{text.page.profile.changePassword}</DialogTitle>
            <DialogDescription>{text.page.profile.changePasswordDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <FieldGroup className="gap-3">
              <Field data-invalid={Boolean(pwError)}>
                <LabelRequire htmlFor="pw-new">
                  {text.page.profile.fieldNewPassword}
                </LabelRequire>
                <InputGroup>
                  <InputGroupInput
                    id="pw-new"
                    type={pwShow ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    minLength={6}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label={pwShow ? 'Hide password' : 'Show password'}
                      onClick={() => setPwShow((v) => !v)}
                    >
                      {pwShow ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field data-invalid={Boolean(pwError)}>
                <LabelRequire htmlFor="pw-confirm">
                  {text.page.profile.fieldConfirmPassword}
                </LabelRequire>
                <InputGroup>
                  <InputGroupInput
                    id="pw-confirm"
                    type={pwShow ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    minLength={6}
                  />
                </InputGroup>
                {pwError && <FieldError errors={[{ message: pwError }]} />}
              </Field>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwOpen(false)}
                disabled={pwSaving}
              >
                {text.page.profile.cancel}
              </Button>
              <Button type="submit" disabled={pwSaving}>
                {pwSaving
                  ? text.page.profile.changePasswordSaving
                  : text.page.profile.changePasswordSave}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
