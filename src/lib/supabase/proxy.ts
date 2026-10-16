import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

// Runs on every matched request from src/proxy.ts.
// Refreshes the Supabase auth token if it's near expiry and rewrites the
// updated session cookies onto both the request (so this request's
// downstream handlers see fresh cookies) and the response (so the browser
// stores them).
//
// Returns the response AND the resolved user so the root proxy can decide
// whether to redirect anonymous traffic to /login.
//
// allowDevAutoLogin: the root proxy passes true only for protected routes,
// so /login, /reset-password and /auth/callback keep their normal behavior.
export async function updateSession(
  request: NextRequest,
  options: { allowDevAutoLogin?: boolean } = {},
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Inbound request.cookies.set takes only (name, value) — they're
          // key/value pairs with no Set-Cookie attributes. Secure is a
          // server→client attribute, not meaningful inbound, so it only
          // belongs on the outbound response.cookies.set call.
          //
          // secure: true forces the Secure attribute on the Set-Cookie
          // header to match server.ts's setAll behavior; supabase-ssr's
          // DEFAULT_COOKIE_OPTIONS doesn't include it and Chrome was
          // rejecting the unsecured cookie in some Server Action redirect
          // flows on HTTPS prod.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, secure: true }),
          )
        },
      },
    },
  )

  // IMPORTANT: getUser() validates the token with Supabase Auth. Do not skip —
  // getSession() alone reads the cookie without verifying it.
  let {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && options.allowDevAutoLogin) {
    user = await devAutoLogin(supabase)
  }

  return { response, user }
}

// Local-dev convenience: signs in as DEV_AUTO_LOGIN_EMAIL so protected pages
// open without the login form. Runs only under `next dev` (every build,
// including Vercel, runs with NODE_ENV=production) and only when both vars
// are set in .env.local. Sign-in cookies flow through setAll above, so this
// request and the browser both get the new session.
//
// Mirrors loginAction's profile check: an account without an active
// user_profiles row is signed straight back out instead of half-working.
async function devAutoLogin(
  supabase: ReturnType<typeof createServerClient>,
): Promise<User | null> {
  if (process.env.NODE_ENV !== 'development') return null
  const email = process.env.DEV_AUTO_LOGIN_EMAIL
  const password = process.env.DEV_AUTO_LOGIN_PASSWORD
  if (!email || !password) return null

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error || !data.user) {
    console.warn('[dev auto-login] sign-in failed:', error?.message)
    return null
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('deactivated_at')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile || profile.deactivated_at) {
    console.warn(
      '[dev auto-login] signed in, but no active user_profiles row for',
      email,
    )
    await supabase.auth.signOut()
    return null
  }

  return data.user
}
