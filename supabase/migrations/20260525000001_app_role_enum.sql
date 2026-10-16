-- Phase 2C Sub-session 1: app_role enum.
-- 6 values, ordered customer-side first, then Dia-Co side.

create type public.app_role as enum (
  'sales_rep',
  'customer_admin',
  'accounting',
  'am',
  'ar',
  'super_admin'
);
