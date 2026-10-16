-- Phase 2C Sub-session 5 — Migration A of 2.
--
-- pending_invites: stores invite intent (role, customer, capability flag snapshot)
-- for users invited to the portal. Supabase Auth owns the auth token / email
-- delivery via supabase.auth.admin.inviteUserByEmail; this table stores what
-- to APPLY once the invitee confirms + sets a password (via finalizeInvite in
-- the /reset-password Server Action).
--
-- RLS is ENABLED with NO policies here. Migration C adds them.
-- Grants are given so Migration C's policies can actually fire.
--
-- Strict re-invite semantics: partial unique index on (customer_id, lower(email))
-- where status='pending' blocks duplicate pending invites for the same email at
-- the same customer. UI must catch the 23505 and offer resend/revoke.

-- ════════════════════════════════════════════════════════════════
-- Extensions
-- ════════════════════════════════════════════════════════════════

create extension if not exists citext;

-- ════════════════════════════════════════════════════════════════
-- Enum
-- ════════════════════════════════════════════════════════════════

create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- ════════════════════════════════════════════════════════════════
-- Table
-- ════════════════════════════════════════════════════════════════

create table public.pending_invites (
  id                          uuid primary key default gen_random_uuid(),
  email                       citext not null,
  invited_by_user_id          uuid not null references auth.users(id) on delete restrict,
  customer_id                 uuid not null references public.customers(id) on delete cascade,
  role                        public.app_role not null,
  can_place_orders            boolean not null,
  can_view_all_company_orders boolean not null,
  can_manage_team             boolean not null,
  can_manage_order_owners     boolean not null,
  can_view_invoices           boolean not null,
  can_make_payments           boolean not null,
  auth_user_id                uuid references auth.users(id) on delete set null,
  status                      public.invite_status not null default 'pending',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  expires_at                  timestamptz not null,
  accepted_at                 timestamptz,
  revoked_at                  timestamptz,
  revoked_by_user_id          uuid references auth.users(id) on delete restrict
);

-- ════════════════════════════════════════════════════════════════
-- Partial unique index — strict re-invite semantics.
-- Only one pending invite per (customer, email) at a time. Accepted, revoked,
-- and expired invites are excluded so a fresh invite can be issued after any
-- terminal state.
-- lower(email::text) cast is required because citext's default comparison is
-- case-insensitive but the index expression must be text for the lower() form
-- to be stable across sessions.
-- ════════════════════════════════════════════════════════════════

create unique index pending_invites_email_customer_pending_uniq
  on public.pending_invites (customer_id, lower(email::text))
  where status = 'pending';

-- ════════════════════════════════════════════════════════════════
-- updated_at trigger — reuse shared set_updated_at() from migration 8.
-- ════════════════════════════════════════════════════════════════

create trigger set_updated_at
before update on public.pending_invites
for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- RLS + grants
-- Grants are the gate; RLS policies (Migration C) are the row filter.
-- No DELETE grant — revoke sets status='revoked', we never remove rows
-- (audit trail).
-- ════════════════════════════════════════════════════════════════

alter table public.pending_invites enable row level security;

grant select, insert, update on public.pending_invites to authenticated;
