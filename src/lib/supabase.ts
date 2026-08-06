/**
 * Fresh Web Lite
 * Supabase Client
 */

import { createClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, string | undefined>

// Support both the VITE_* naming and the NEXT_PUBLIC_* variables
// provisioned by the Vercel Supabase integration.
const supabaseUrl = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or the VITE_ equivalents).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
