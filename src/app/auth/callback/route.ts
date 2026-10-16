import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeRedirectTo } from '@/lib/auth/redirect'

// PKCE callback handler. Supabase email links (password reset, magic link,
// signup confirmation) land here with a ?code= query param. We exchange the
// code for a session (sets auth cookies), then redirect to ?next.
//
// If the exchange fails (expired, malformed, or already used code), we
// bounce to /login — the page that catches the user lacks a recovery session.
// /reset-password specifically checks for a live session and shows
// "invalid or expired" if not present, so this fallback chain is safe.
//
// Invite emails can't use ?code=. They are sent server-side by
// admin.inviteUserByEmail, so no browser holds a PKCE verifier, and
// Supabase's default link would put the tokens in the URL #fragment, which a
// route handler never sees. The Invite email template therefore links here
// with ?token_hash=&type=invite. We do NOT verify on this GET: link scanners
// and prefetchers would burn the one-time token (the logout-prefetch lesson).
// We forward the params to /auth/confirm, whose button POSTs the verifyOtp.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = sanitizeRedirectTo(url.searchParams.get('next'))

  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  if (tokenHash && type) {
    const confirm = new URL('/auth/confirm', request.url)
    confirm.searchParams.set('token_hash', tokenHash)
    confirm.searchParams.set('type', type)
    confirm.searchParams.set('next', next)
    return NextResponse.redirect(confirm)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  return NextResponse.redirect(new URL('/login', request.url))
}
