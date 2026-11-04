/**
 * Fresh Web Lite
 * Supabase Client
 */

import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
}

// Passkeys/WebAuthn are intentionally opted in here so the rest of the
// application can use one authenticated identity without handling biometric
// material itself. The browser/device owns the private credential.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    experimental: { passkey: true },
  },
})
