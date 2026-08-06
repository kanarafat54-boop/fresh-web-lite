import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose both VITE_ and NEXT_PUBLIC_ prefixed env vars to the client.
  // This project's Supabase credentials are provided as NEXT_PUBLIC_* vars.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
