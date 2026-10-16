-- All Postgres enum types used across the schema.
-- Create these before any table that references them.

create type customer_status as enum ('active', 'inactive', 'suspended');

create type user_type as enum ('customer_rep', 'am', 'admin', 'super_admin');

create type customer_rep_role as enum ('primary', 'accounting', 'additional');

create type user_status as enum ('active', 'inactive');

create type stone_category as enum ('natural_diamond', 'lab_diamond', 'color_stone');

create type finish_point as enum (
  'file',
  'wax',
  'raw_casting',
  'polished_mounting',
  'finished_piece'
);

create type order_status as enum (
  'draft',
  'designing',
  'approved',
  'in_production',
  'qc',
  'shipping',
  'on_hold',
  'cancelled'
);

create type order_sub_status as enum (
  'awaiting_design',
  'awaiting_review',
  'redesigning'
);

create type priority_rush_status as enum (
  'not_requested',
  'requested',
  'approved_by_am',
  'denied'
);

create type supply_source as enum ('customer', 'diaco');

create type cad_customer_action as enum ('approved', 'modification_requested');

create type render_image_role as enum ('hero', 'setting_map', 'detail', 'render');

create type quote_line_type as enum (
  'designing',
  'wax',
  'metal',
  'casting_labor',
  'cleaning_labor',
  'polishing',
  'setting',
  'findings',
  'engraving',
  'shipping',
  'discount',
  'other'
);

create type history_event_type as enum (
  'order_submitted',
  'cad_delivered',
  'modification_requested',
  'cad_approved',
  'priority_rush_requested',
  'priority_rush_approved',
  'priority_rush_denied',
  'status_changed',
  'on_hold',
  'resumed',
  'cancelled',
  'shipped',
  'internal_note'
);

create type actor_side as enum ('customer', 'diaco', 'system');

create type message_sender_side as enum ('customer', 'diaco');

create type attachment_purpose as enum (
  'submission_reference',
  'engraving_logo',
  'customer_stone_photo',
  'customer_stone_cert',
  'modification_reference',
  'quote_pdf',
  'final_video',
  'shipping_label',
  'invoice',
  'internal_note_attachment',
  'other'
);

create type attachment_source as enum ('customer', 'diaco', 'system');
