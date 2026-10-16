-- Single trigger function applied to every table with an updated_at column.
-- Keeps updated_at in sync without app-layer plumbing.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Master / reference tables
create trigger set_updated_at before update on metals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on stone_types
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on stone_shapes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on setting_styles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on product_types
  for each row execute function public.set_updated_at();

-- Customers, users, preferences
create trigger set_updated_at before update on customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on user_notification_preferences
  for each row execute function public.set_updated_at();

-- Orders and order spec children
create trigger set_updated_at before update on orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on order_metals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on order_center_stones
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on order_accent_stones
  for each row execute function public.set_updated_at();

-- CAD versions and snapshots
create trigger set_updated_at before update on cad_versions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on cad_version_renders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on cad_version_metal_weights
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on cad_version_center_stones
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on cad_version_accent_stones
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on cad_version_quote_lines
  for each row execute function public.set_updated_at();

-- History, messages, attachments
create trigger set_updated_at before update on order_history_events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on order_messages
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on order_attachments
  for each row execute function public.set_updated_at();
