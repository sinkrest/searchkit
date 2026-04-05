import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a mock client during build time
    return null;
  }

  client = createBrowserClient(url, key);
  return client;
}
