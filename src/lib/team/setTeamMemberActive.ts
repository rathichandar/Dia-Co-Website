"use server"

// ============================================================
// setTeamMemberActive Server Action — Phase 2C Sub-session 5 Group 3.
//
// Called by the /team UI's Deactivate / Reactivate buttons. Toggles
// user_profiles.deactivated_at between NULL (active) and now() (deactivated).
//
// Deactivation is soft — the row + auth session both remain intact. The
// deactivated user stays logged in until natural session expiry; the SS5
// /login modification (deactivated_at IS NULL post-auth check) blocks their
// next login. This is a deliberate design lock — we don't yank active
// sessions on deactivation. If we need to force logout, that's a future
// admin API call (admin.auth.admin.signOut(userId)) — out of scope for SS5.
//
// Cookie-bound client only. No admin API calls — deactivation is a DB
// UPDATE, not an auth operation.
//
// NB — deliberate deviation from Group 1's { ok, error } return shape:
// Group 3 actions return { ok, code, message } instead. The /team UI needs
// to programmatically branch on error type (CANNOT_TARGET_SELF gets a
// different UI treatment than FORBIDDEN, etc.). Shape shared with
// updateTeamMemberFlags.
//
// NB — Zod is used for input validation (module-scope schema, reusable).
// First tree adoption pattern established in updateTeamMemberFlags.
//
// revalidatePath('/team') on success: the row shifts between active /
// deactivated sections in the UI. Unlike flag toggles (where optimistic
// UI owns the visual state), status changes reorganize the list — a
// server refetch is the right behavior.
// ============================================================

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// ---- Zod schema (module scope) ----

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  active: z.boolean(),
})

// ---- Shared error contract (duplicated from updateTeamMemberFlags) ----

const TEAM_ACTION_ERROR = {
  UNAUTHENTICATED: "unauthenticated",
  INVALID_INPUT: "invalid_input",
  CANNOT_TARGET_SELF: "cannot_target_self",
  TARGET_NOT_FOUND: "target_not_found",
  FORBIDDEN: "forbidden",
  DATABASE_ERROR: "database_error",
} as const

type TeamActionErrorCode =
  (typeof TEAM_ACTION_ERROR)[keyof typeof TEAM_ACTION_ERROR]

// All user_profiles columns. Same shape as updateTeamMemberFlags.UserProfileRow;
// re-declared per-file for now, factor to team/types module if a third
// Group 3 action lands.
export interface UserProfileRow {
  id: string
  role: string
  customer_id: string | null
  can_place_orders: boolean
  can_view_all_company_orders: boolean
  can_manage_team: boolean
  can_view_invoices: boolean
  can_make_payments: boolean
  can_manage_order_owners: boolean
  deactivated_at: string | null
  created_at: string
  updated_at: string
}

export type SetTeamMemberActiveResult =
  | { ok: true; data: UserProfileRow }
  | { ok: false; code: TeamActionErrorCode; message: string }

export async function setTeamMemberActive(
  targetUserId: string,
  active: boolean,
): Promise<SetTeamMemberActiveResult> {
  const supabase = await createClient()

  // ---- 1. Auth check ----
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.UNAUTHENTICATED,
      message: "You must be logged in.",
    }
  }

  // ---- 2. Input validation via Zod ----
  const parsed = inputSchema.safeParse({ targetUserId, active })
  if (!parsed.success) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.INVALID_INPUT,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    }
  }

  // ---- 3. Cannot target self ----
  if (targetUserId === user.id) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.CANNOT_TARGET_SELF,
      message: "You cannot change your own status.",
    }
  }

  // ---- 4. Fetch caller profile ----
  const { data: callerProfile, error: callerErr } = await supabase
    .from("user_profiles")
    .select("role, customer_id, can_manage_team")
    .eq("id", user.id)
    .maybeSingle()
  if (callerErr) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.DATABASE_ERROR,
      message: `Profile lookup failed: ${callerErr.message}`,
    }
  }
  if (!callerProfile) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.UNAUTHENTICATED,
      message: "Your account is not set up correctly.",
    }
  }

  // ---- 5. Fetch target profile ----
  const { data: targetProfile, error: targetErr } = await supabase
    .from("user_profiles")
    .select("id, role, customer_id, deactivated_at")
    .eq("id", targetUserId)
    .maybeSingle()
  if (targetErr) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.DATABASE_ERROR,
      message: `Target lookup failed: ${targetErr.message}`,
    }
  }
  if (!targetProfile) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.TARGET_NOT_FOUND,
      message: "Team member not found.",
    }
  }

  // ---- 6. Target must not be super_admin ----
  if (targetProfile.role === "super_admin") {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.FORBIDDEN,
      message: "Cannot change the status of a super admin.",
    }
  }

  // ---- 7. Target must be in caller's customer ----
  if (targetProfile.customer_id !== callerProfile.customer_id) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.FORBIDDEN,
      message: "You don't have permission to change this team member's status.",
    }
  }

  // ---- 8. Caller must have can_manage_team ----
  if (!callerProfile.can_manage_team) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.FORBIDDEN,
      message: "You don't have permission to manage team member status.",
    }
  }

  // ---- 9. UPDATE deactivated_at ----
  const { data: updated, error: updateErr } = await supabase
    .from("user_profiles")
    .update({
      deactivated_at: active ? null : new Date().toISOString(),
    })
    .eq("id", targetUserId)
    .select()
    .single()

  if (updateErr) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.DATABASE_ERROR,
      message: `Update failed: ${updateErr.message}`,
    }
  }

  // Refetch /team so the row moves between active/deactivated sections.
  revalidatePath("/team")

  return { ok: true, data: updated as UserProfileRow }
}
