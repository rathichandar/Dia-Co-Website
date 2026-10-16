-- CAD versions and their snapshot tables.
-- Each cad_versions row freezes the order's spec inputs and per-version outputs (quote lines)
-- at the time the version was delivered to the customer. Append-only.

create table cad_versions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  version_number int not null,

  designer_internal_name text,          -- NEVER exposed to customer-facing endpoints
  designer_note text,

  three_d_viewer_url text,

  delivered_at timestamptz not null,
  customer_action cad_customer_action,
  customer_action_at timestamptz,
  customer_action_by_user_id uuid references users (id),
  modification_request_text text,

  -- Quote-input snapshots from order state at delivery time.
  finish_point finish_point not null,
  quantity int not null,
  size_spec text,
  engraving_text text,
  engraving_logo_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cad_versions_order_version_unique unique (order_id, version_number)
);

create index cad_versions_order_id_idx on cad_versions (order_id);
create index cad_versions_customer_action_by_user_id_idx on cad_versions (customer_action_by_user_id);
create index cad_versions_delivered_at_idx on cad_versions (delivered_at desc);

create table cad_version_renders (
  id uuid primary key default gen_random_uuid(),
  cad_version_id uuid not null references cad_versions (id) on delete cascade,
  image_url text not null,
  image_role render_image_role,
  display_order int not null default 0,
  file_size_bytes bigint,
  mime_type text,
  original_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cad_version_renders_cad_version_id_idx on cad_version_renders (cad_version_id);

create table cad_version_metal_weights (
  id uuid primary key default gen_random_uuid(),
  cad_version_id uuid not null references cad_versions (id) on delete cascade,
  order_metal_id uuid not null references order_metals (id),
  weight_grams numeric(8,3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cad_version_metal_weights_unique unique (cad_version_id, order_metal_id)
);

create index cad_version_metal_weights_cad_version_id_idx on cad_version_metal_weights (cad_version_id);
create index cad_version_metal_weights_order_metal_id_idx on cad_version_metal_weights (order_metal_id);

create table cad_version_center_stones (
  id uuid primary key default gen_random_uuid(),
  cad_version_id uuid not null references cad_versions (id) on delete cascade,
  display_order int not null default 0,
  quantity int not null default 1,
  stone_type_id uuid not null references stone_types (id),
  custom_stone_type_name text,
  stone_shape_id uuid not null references stone_shapes (id),
  size_mm numeric(6,2),
  size_mm_secondary numeric(6,2),
  carat_each numeric(7,4),
  carat_total_weight numeric(7,4),
  quality_color text,
  quality_clarity text,
  quality_description text,
  supply_source supply_source not null,
  setting_style_id uuid references setting_styles (id),
  prong_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cad_version_center_stones_cad_version_id_idx on cad_version_center_stones (cad_version_id);
create index cad_version_center_stones_stone_type_id_idx on cad_version_center_stones (stone_type_id);
create index cad_version_center_stones_stone_shape_id_idx on cad_version_center_stones (stone_shape_id);
create index cad_version_center_stones_setting_style_id_idx on cad_version_center_stones (setting_style_id);

create table cad_version_accent_stones (
  id uuid primary key default gen_random_uuid(),
  cad_version_id uuid not null references cad_versions (id) on delete cascade,
  group_label text,
  display_order int not null default 0,
  stone_type_id uuid not null references stone_types (id),
  custom_stone_type_name text,
  stone_shape_id uuid not null references stone_shapes (id),
  quantity int not null,
  size_mm numeric(6,2),
  size_mm_secondary numeric(6,2),
  carat_each numeric(7,4),
  carat_total_weight numeric(7,4),
  quality_color text,
  quality_clarity text,
  quality_description text,
  supply_source supply_source not null,
  setting_style_id uuid references setting_styles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cad_version_accent_stones_cad_version_id_idx on cad_version_accent_stones (cad_version_id);
create index cad_version_accent_stones_stone_type_id_idx on cad_version_accent_stones (stone_type_id);
create index cad_version_accent_stones_stone_shape_id_idx on cad_version_accent_stones (stone_shape_id);
create index cad_version_accent_stones_setting_style_id_idx on cad_version_accent_stones (setting_style_id);

create table cad_version_quote_lines (
  id uuid primary key default gen_random_uuid(),
  cad_version_id uuid not null references cad_versions (id) on delete cascade,
  line_type quote_line_type not null,
  description text not null,
  quantity numeric(8,3),
  unit text,
  unit_price_cents bigint,
  line_total_cents bigint not null,
  group_label text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cad_version_quote_lines_cad_version_id_idx on cad_version_quote_lines (cad_version_id);
