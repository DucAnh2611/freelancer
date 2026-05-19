import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Aux client with its own storage key + no persistence: used when a hirer
// creates an employee via signUp. Supabase-js swaps the "current" session on
// signUp, so running that on the main client would sign the hirer out. A
// namespaced client keeps that transient session isolated.
export const supabaseAux = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-aux-session',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
