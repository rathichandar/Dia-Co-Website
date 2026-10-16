"use server"

// ============================================================
// updateTeamMemberFlags Server Action — Phase 2C Sub-session 5 Group 3.
//
// Called by the /team UI's per-user flag toggles. Customer Admin flips a
// capability flag on a team member; this action validates authority + writes
// the change. Only capability flag columns are ever touched — role,
// customer_id, and deactivated_at are protected by the SS3 immutability
// trigger + separate action (setTeamMemberActive) respectively.
//
// Cookie-bound client only. No admin API calls in this flow — RLS UPDATE
// on user_profiles (SS3 policy) permits Customer Admin to update teammate
// rows within their customer, and this action is the enforcement layer for
// the "cannot target self" + "can_manage_team required" rules that live
// in the Server Action (per SS5 lock — not in RLS).
//
// NB — deliberate deviation from Group 1's { ok, error } return shape:
// Group 3 actions return { ok, code, message } instead. The /team UI needs
// to programmatically branch on error type (CANNOT_TARGET_SELF gets a
// different UI treatment than FORBIDDEN, etc.), which a bare string can't
// support without fragile message-parsing. Both actions in Group 3 share
// the shape.
//
// NB — first tree adoption of Zod. Sets precedent for input validation in
// future Server Actions. Zod schemas live at module scope (reusable,
// testable, no per-call compile overhead).
//
// No revalidatePath on success. The /team UI uses optimistic updates for
// flag toggles — revalidating would flash the toggle from optimistic-new
// back to fetched-old and then to fetched-new. The action returns the
// full updated row so the client can commit its optimistic state.
// ============================================================

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// ---- Zod schemas (module scope, reusable) ----

// The 6 capability flag column names, in the order used throughout SS5.
// z.enum tuple keeps TS in sync with the DB schema.
const CAPABILITY_FLAG_NAMES = [
  "can_place_orders",
  "can_view_all_company_orders",
  "can_manage_team",
  "can_view_invoices",
  "can_make_payments",
  "can_manage_order_owners",
] as const

// Strict object: every key optional, but unknown keys rejected (.strict()),
// and at least one key must be present (refine).
const flagsSchema = z
  .object({
    can_place_orders: z.boolean().optional(),
    can_view_all_company_orders: z.boolean().optional(),
    can_manage_team: z.boolean().optional(),
    can_view_invoices: z.boolean().optional(),
    can_make_payments: z.boolean().optional(),
    can_manage_order_owners: z.boolean().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one flag must be provided.",
  })

const inputSchema = z.object({
  targetUserId: z.string().uuid(),
  flags: flagsSchema,
})

// ---- Shared error contract (duplicated in setTeamMemberActive; could be
//      factored to a team/types module later if a third Group 3 action lands) ----

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

// All user_profiles columns. Return shape for both Group 3 actions.
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

export type UpdateTeamMemberFlagsResult =
  | { ok: true; data: UserProfileRow }
  | { ok: false; code: TeamActionErrorCode; message: string }

export type CapabilityFlag = (typeof CAPABILITY_FLAG_NAMES)[number]

export async function updateTeamMemberFlags(
  targetUserId: string,
  flags: Partial<Record<CapabilityFlag, boolean>>,
): Promise<UpdateTeamMemberFlagsResult> {
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
  const parsed = inputSchema.safeParse({ targetUserId, flags })
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
      message: "You cannot change your own permissions.",
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
      message: "Cannot change permissions for a super admin.",
    }
  }

  // ---- 7. Target must be in caller's customer ----
  if (targetProfile.customer_id !== callerProfile.customer_id) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.FORBIDDEN,
      message: "You don't have permission to manage this team member.",
    }
  }

  // ---- 8. Caller must have can_manage_team ----
  if (!callerProfile.can_manage_team) {
    return {
      ok: false,
      code: TEAM_ACTION_ERROR.FORBIDDEN,
      message: "You don't have permission to manage team members.",
    }
  }

  // ---- 9. UPDATE — dynamic column set from parsed flags ----
  // parsed.data.flags is a validated Partial<Record<CapabilityFlag, boolean>>
  // with at least one key. Supabase .update() takes it as-is.
  const { data: updated, error: updateErr } = await supabase
    .from("user_profiles")
    .update(parsed.data.flags)
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

  return { ok: true, data: updated as UserProfileRow }
}
