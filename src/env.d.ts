interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FRESH_MEDIA_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
