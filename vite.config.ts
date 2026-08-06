import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose both VITE_* and NEXT_PUBLIC_* variables to the client.
  // The Supabase integration provisions NEXT_PUBLIC_SUPABASE_* variables.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
