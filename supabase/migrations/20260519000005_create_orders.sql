-- Orders and their direct child specification tables (metals, center/accent stones).
-- CAD versions and their snapshots live in the next migration.

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,                  -- software-generated, nullable until submission
  style_number text,                         -- software-generated, nullable until submission
  client_po text,
  end_customer_name text,

  customer_id uuid not null references customers (id),
  submitted_by_user_id uuid references users (id),

  product_type_id uuid not null references product_types (id),
  description text,

  finish_point finish_point not null,
  size_spec text,
  quantity int not null default 1,
  engraving_text text,
  engraving_logo_url text,

  status order_status not null,
  sub_status order_sub_status,

  priority_rush boolean not null default false,
  priority_rush_fee_cents bigint,
  priority_rush_status priority_rush_status not null default 'not_requested',

  on_hold_reason text,
  on_hold_since timestamptz,
  prior_status order_status,

  set_id uuid,                               -- soft grouping; orders sharing a set_id ship together

  ship_to_recipient_name text not null,
  ship_to_address_line1 text not null,
  ship_to_address_line2 text,
  ship_to_city text not null,
  ship_to_state text not null,
  ship_to_postal_code text not null,
  ship_to_country text not null default 'US',
  ship_to_insured_value_cents bigint,

  cancelled_at timestamptz,
  cancelled_by_user_id uuid references users (id),
  cancelled_reason text,

  submitted_at timestamptz,
  approved_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_sub_status_check check (
    (status = 'designing' and sub_status is not null)
    or (status <> 'designing' and sub_status is null)
  ),
  constraint orders_on_hold_check check (
    (on_hold_since is not null) = (status = 'on_hold')
  ),
  constraint orders_quantity_check check (quantity >= 1)
);

create index orders_customer_id_idx on orders (customer_id);
create index orders_status_idx on orders (status);
create index orders_submitted_by_user_id_idx on orders (submitted_by_user_id);
create index orders_product_type_id_idx on orders (product_type_id);
create index orders_set_id_idx on orders (set_id) where set_id is not null;
create index orders_cancelled_by_user_id_idx on orders (cancelled_by_user_id);
create index orders_submitted_at_idx on orders (submitted_at desc);

create table order_metals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  metal_id uuid not null references metals (id),
  area text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint order_metals_order_area_unique unique (order_id, area)
);

create index order_metals_order_id_idx on order_metals (order_id);
create index order_metals_metal_id_idx on order_metals (metal_id);

create table order_center_stones (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
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
  cut_grade text,
  quality_description text,

  supply_source supply_source not null,
  customer_stone_received_at timestamptz,
  customer_stone_notes text,

  certification_lab text,
  certification_number text,
  certification_url text,

  setting_style_id uuid references setting_styles (id),
  prong_count int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_center_stones_order_id_idx on order_center_stones (order_id);
create index order_center_stones_stone_type_id_idx on order_center_stones (stone_type_id);
create index order_center_stones_stone_shape_id_idx on order_center_stones (stone_shape_id);
create index order_center_stones_setting_style_id_idx on order_center_stones (setting_style_id);

create table order_accent_stones (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
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
  customer_stone_received_at timestamptz,
  customer_stone_notes text,

  setting_style_id uuid references setting_styles (id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_accent_stones_order_id_idx on order_accent_stones (order_id);
create index order_accent_stones_stone_type_id_idx on order_accent_stones (stone_type_id);
create index order_accent_stones_stone_shape_id_idx on order_accent_stones (stone_shape_id);
create index order_accent_stones_setting_style_id_idx on order_accent_stones (setting_style_id);
