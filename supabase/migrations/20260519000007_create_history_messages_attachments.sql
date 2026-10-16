-- Order history events (append-only audit), real-time messages, and attachments.

create table order_history_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  event_type history_event_type not null,
  actor_side actor_side not null,
  actor_user_id uuid references users (id),
  actor_display_name text,
  summary text,
  payload jsonb,
  related_cad_version_id uuid references cad_versions (id),
  is_customer_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_history_events_order_id_idx on order_history_events (order_id);
create index order_history_events_actor_user_id_idx on order_history_events (actor_user_id);
create index order_history_events_event_type_idx on order_history_events (event_type);
create index order_history_events_related_cad_version_id_idx on order_history_events (related_cad_version_id);
create index order_history_events_order_created_idx on order_history_events (order_id, created_at desc);

create table order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  sender_user_id uuid not null references users (id),
  sender_side message_sender_side not null,
  body text not null,
  read_by jsonb not null default '[]'::jsonb,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_messages_order_id_idx on order_messages (order_id);
create index order_messages_sender_user_id_idx on order_messages (sender_user_id);
create index order_messages_order_created_idx on order_messages (order_id, created_at desc);

create table order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  purpose attachment_purpose not null,
  source attachment_source not null,
  uploaded_by_user_id uuid references users (id),
  file_url text not null,
  original_filename text not null,
  file_size_bytes bigint not null,
  mime_type text not null,
  description text,
  related_cad_version_id uuid references cad_versions (id),
  related_event_id uuid references order_history_events (id),
  is_customer_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index order_attachments_order_id_idx on order_attachments (order_id);
create index order_attachments_uploaded_by_user_id_idx on order_attachments (uploaded_by_user_id);
create index order_attachments_related_cad_version_id_idx on order_attachments (related_cad_version_id);
create index order_attachments_related_event_id_idx on order_attachments (related_event_id);
create index order_attachments_order_active_idx on order_attachments (order_id) where deleted_at is null;
