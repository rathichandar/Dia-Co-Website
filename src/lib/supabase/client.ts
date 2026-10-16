import { createBrowserClient } from '@supabase/ssr'

// Browser Supabase client. Use inside Client Components ('use client').
// Safe to call repeatedly — @supabase/ssr returns the same singleton per browser session.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
