import { supabase } from '@/config/supabase'
import { supabaseAux } from '@/config/supabase-aux'
import type { Tables, UserRole } from '@/types/database'

export type ProfileListItem = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email' | 'role'>

export type ListProfilesOptions = {
  role?: UserRole
  excludeId?: string
}

export async function listProfiles({
  role,
  excludeId,
}: ListProfilesOptions = {}): Promise<ProfileListItem[]> {
  let query = supabase.from('profiles').select('id, full_name, email, role')
  if (role) query = query.eq('role', role)
  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Generates a 16-char password drawn from a URL-safe alphabet. Uses
// crypto.getRandomValues so the entropy source is the same on every browser.
function generatePassword(length = 16): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#%&*'
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export type CreateEmployeeResult = {
  id: string | null
  email: string
  password: string
}

// Creates an employee account on the hirer's behalf. Runs through the aux
// Supabase client so the hirer's session isn't swapped. The profile row is
// populated by the auth.users INSERT trigger (handle_new_user).
export async function createEmployeeAccount(
  emailInput: string,
): Promise<CreateEmployeeResult> {
  const email = emailInput.trim().toLowerCase()
  if (!email) throw new Error('Email is required')

  // Cheap existence check so the hirer gets a clean error instead of the
  // generic "User already registered" from the signUp endpoint. Profiles are
  // populated via trigger on every auth.users insert, so this covers every
  // registered account the RLS policy exposes.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existing) throw new Error('An account with this email already exists')

  const password = generatePassword()
  const fullName = email.split('@')[0]

  const { data, error } = await supabaseAux.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'employee' satisfies UserRole },
    },
  })
  if (error) throw error

  // Drop the aux session immediately so the temporary employee auth doesn't
  // stick around in memory. persistSession: false already blocks disk writes.
  await supabaseAux.auth.signOut().catch(() => {})

  return { id: data.user?.id ?? null, email, password }
}
