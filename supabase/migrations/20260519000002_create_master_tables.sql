-- Master / reference tables. No FK dependencies on operational tables.
-- Seeded in the next migration.

create table metals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text,
  karat int,
  color text,
  base_metal text,
  conversion_factor_from_10kyg numeric(6,3) not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index metals_is_active_idx on metals (is_active);

create table stone_types (
  id uuid primary key default gen_random_uuid(),
  category stone_category not null,
  name text not null,
  short_code text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stone_types_category_idx on stone_types (category);
create index stone_types_is_active_idx on stone_types (is_active);

create table stone_shapes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stone_shapes_is_active_idx on stone_shapes (is_active);

create table setting_styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index setting_styles_is_active_idx on setting_styles (is_active);

create table product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null unique,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_types_is_active_idx on product_types (is_active);
