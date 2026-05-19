import { LabelRequire } from '@/components/label-require'
import { SelectCombobox } from '@/components/select-combobox'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types/database'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const roleItems: { value: UserRole; label: string }[] = [
  { value: 'hirer', label: 'Hirer' },
  { value: 'employee', label: 'Employee' },
]

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email, password, fullName, role)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign up for Freelancer Manager</p>
        </div>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-3">
            {error && (
              <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
                {error}
              </div>
            )}

            <Field>
              <LabelRequire htmlFor="fullName">Full Name</LabelRequire>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </Field>

            <Field>
              <LabelRequire htmlFor="email">Email</LabelRequire>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field>
              <LabelRequire htmlFor="password">Password</LabelRequire>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <LabelRequire>Role</LabelRequire>
              <SelectCombobox
                items={roleItems}
                value={role}
                onChange={(v) => v && setRole(v)}
              />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <UserPlus className="size-4" />
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
