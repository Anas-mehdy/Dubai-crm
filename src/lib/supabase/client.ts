'use client';

import { createBrowserClient } from '@supabase/ssr';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Validate URL before creating client
  if (!url || !key || !url.startsWith('https://')) {
    // Return a mock-like client that won't crash the UI
    // Components should handle errors gracefully
    clientInstance = createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
    );
    return clientInstance;
  }

  clientInstance = createBrowserClient(url, key);
  return clientInstance;
}
