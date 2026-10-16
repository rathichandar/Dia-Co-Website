// Layout shared by every authenticated route. The proxy ensures we only
// ever reach this layout with a live session, so getUser() should always
// return a user — we still treat user==null defensively to avoid throwing
// during edge cases (cache races, expired-mid-render, etc).

import { createClient } from '@/lib/supabase/server'
import { TopNav } from '@/components/TopNav'
import '../diaco-design.css'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <TopNav userEmail={user?.email ?? null} />
      {children}
    </>
  )
}
