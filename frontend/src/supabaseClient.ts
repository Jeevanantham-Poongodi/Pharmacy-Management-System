import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// D-001: the browser uses Supabase for sign-in only (sign-in, session refresh, sign-out, MFA).
// All application data is read and written through the FastAPI backend. Only `auth` is exported
// so no component can query Supabase tables or storage.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const authConfigError: string | null =
  url && anonKey
    ? null
    : 'Sign-in is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local.'

const client: SupabaseClient | null = authConfigError ? null : createClient(url!, anonKey!)

export const auth = client?.auth ?? null
