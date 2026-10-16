-- Customers, users, and user notification preferences.
-- customers.assigned_am_id → users(id) and users.customer_id → customers(id) form a circular FK.
-- We create both tables without the customers→users FK, then add it at the end.

create table customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  name text not null,
  tax_id text,
  status customer_status not null,
  assigned_am_id uuid,            -- FK added at end of file, after users exists
  credit_limit_cents bigint,
  net_terms_days int,
  phone text not null,
  billing_address_line1 text not null,
  billing_address_line2 text,
  billing_city text not null,
  billing_state text not null,
  billing_postal_code text not null,
  billing_country text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_status_idx on customers (status);
create index customers_assigned_am_id_idx on customers (assigned_am_id);

create table users (
  -- id matches auth.users.id from Supabase Auth
  id uuid primary key,
  email text unique not null,
  user_type user_type not null,
  customer_id uuid references customers (id),
  customer_rep_role customer_rep_role,
  full_name text not null,
  phone text,
  avatar_url text,
  timezone text,
  status user_status not null,
  invited_by_user_id uuid references users (id),
  accepted_terms_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- customer_rep users must have a customer_id + role; all other types must not.
  constraint users_customer_rep_fields_check check (
    (user_type = 'customer_rep'
       and customer_id is not null
       and customer_rep_role is not null)
    or
    (user_type <> 'customer_rep'
       and customer_id is null
       and customer_rep_role is null)
  )
);

create index users_customer_id_idx on users (customer_id);
create index users_user_type_idx on users (user_type);
create index users_status_idx on users (status);
create index users_invited_by_user_id_idx on users (invited_by_user_id);

-- Now that users exists, attach the customers.assigned_am_id FK.
alter table customers
  add constraint customers_assigned_am_id_fkey
  foreign key (assigned_am_id) references users (id);

create table user_notification_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  email_enabled boolean not null default true,
  email_for_cad_ready boolean not null default true,
  email_for_order_approved boolean not null default true,
  email_for_order_shipped boolean not null default true,
  email_for_quote_expiring boolean not null default true,
  email_for_invoice boolean not null default true,
  email_for_am_message boolean not null default true,
  email_for_order_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
