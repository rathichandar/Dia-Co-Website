-- Phase A schema additions: customer/order metadata, invoice notification breakdown,
-- prong_count removal, designer_note → delivery_note rename.
-- Idempotent: re-running this migration is a no-op.

-- 1. customers: account metadata + default ship-to address
alter table customers
  add column if not exists acquisition_source text,
  add column if not exists referred_by_customer_id uuid references customers (id),
  add column if not exists sales_rep_id uuid references users (id),
  add column if not exists account_notes text,
  add column if not exists default_ship_to_recipient_name text,
  add column if not exists default_ship_to_address_line1 text,
  add column if not exists default_ship_to_address_line2 text,
  add column if not exists default_ship_to_city text,
  add column if not exists default_ship_to_state text,
  add column if not exists default_ship_to_postal_code text,
  add column if not exists default_ship_to_country text default 'US';

create index if not exists customers_referred_by_customer_id_idx
  on customers (referred_by_customer_id);
create index if not exists customers_sales_rep_id_idx
  on customers (sales_rep_id);

-- Disallow self-referrals. No ADD CONSTRAINT IF NOT EXISTS; guard with a DO block.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_referral_not_self'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table customers
      add constraint customers_referral_not_self
      check (referred_by_customer_id is null or referred_by_customer_id <> id);
  end if;
end $$;

-- 2. orders: due-date / ship-date estimates + per-order AM override
alter table orders
  add column if not exists customer_requested_due_date date,
  add column if not exists expected_ship_date date,
  add column if not exists assigned_am_id uuid references users (id);

create index if not exists orders_assigned_am_id_idx
  on orders (assigned_am_id);

-- 3. user_notification_preferences: split invoice into billing-event breakdown,
--    plus ship-date-changed notification.
alter table user_notification_preferences
  drop column if exists email_for_invoice;

alter table user_notification_preferences
  add column if not exists email_for_invoice_created boolean not null default true,
  add column if not exists email_for_payment_due_soon boolean not null default true,
  add column if not exists email_for_payment_overdue boolean not null default true,
  add column if not exists email_for_payment_received boolean not null default true,
  add column if not exists email_for_ship_date_changed boolean not null default true;

-- 4. order_center_stones: drop prong_count (was form-collected, now derived in production)
alter table order_center_stones
  drop column if exists prong_count;

-- 5. cad_version_center_stones: drop prong_count from snapshot
alter table cad_version_center_stones
  drop column if exists prong_count;

-- 6. cad_versions: rename designer_note → delivery_note.
--    No IF EXISTS form for RENAME COLUMN; guard with a DO block for idempotency.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cad_versions'
      and column_name = 'designer_note'
  ) then
    alter table cad_versions rename column designer_note to delivery_note;
  end if;
end $$;
