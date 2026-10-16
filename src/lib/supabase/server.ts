import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Supabase client. Use in Server Components, Route Handlers, and Server Actions.
// Next.js 16 made cookies() async, so this function is async and must be awaited.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Setting cookies during Server Component rendering throws (only Server
          // Actions / Route Handlers can write Set-Cookie headers). Swallow that
          // case — token refresh still happens via the proxy on the next request.
          //
          // secure: true forces the Secure attribute on the Set-Cookie header.
          // supabase-ssr's DEFAULT_COOKIE_OPTIONS doesn't include Secure, and
          // Chrome was rejecting the unsecured cookie in some Server Action
          // redirect flows on HTTPS prod. Localhost is treated as a secure
          // origin by modern browsers, so Secure works in dev too.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, secure: true }),
            )
          } catch {
            // ignore: invoked from a Server Component
          }
        },
      },
    },
  )
}
