// The order as the ERP receives it (ERP_INTEGRATION_CONTRACT.md §6 — Step 3).
//
// Built on the SERVER from the Portal's own tables, never from what the browser sends, so what Dia-Co
// receives is exactly what the customer saved. Names, not ids: the ERP has its own vocabulary and maps the
// Portal's words onto it itself (its _portal_intake_form) — exact matches pre-fill, anything else is left
// for the AM. The keys here are the keys that function reads.

import { createClient } from '@/lib/supabase/server'

export interface OrderSnapshot {
  portal_order_id: string
  submitted_by_name: string
  client_po: string | null
  end_customer_name: string | null
  product_type_code: string | null
  product_type_name: string | null
  size_spec: string | null
  quantity: number
  finish_point: string | null
  description: string | null
  submission_notes: string | null
  engraving_text: string | null
  engraving_text_position: string | null
  engraving_use_logo: boolean
  engraving_logo_position: string | null
  shipping_method: string | null
  ship_to: { recipient: string; line1: string; line2: string; city: string; state: string; postal: string; country: string; phone: string }
  has_center_stones: string | null
  has_accent_stones: string | null
  metals: { name: string | null; karat: number | null; color: string | null; base_metal: string | null; area: string | null; finish: string | null }[]
  center_stones: {
    stone_type: string | null
    category: string | null
    custom_name: string | null
    shape: string | null
    supply: string | null
    carat_min: number | null
    carat_max: number | null
    color_min: string | null
    color_max: string | null
    clarity_min: string | null
    clarity_max: string | null
    make_min: string | null
    make_max: string | null
    certification: string[]
    length_mm: number | null
    width_mm: number | null
    depth_mm: number | null
  }[]
  accent_stones: { stone_type: string | null; category: string | null; supply: string | null; quality_color: string | null; quality_clarity: string | null }[]
}

export type SnapshotResult = { ok: true; snapshot: OrderSnapshot } | { ok: false; error: string }

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))
const s = (v: unknown): string => (typeof v === 'string' ? v : '')

export async function buildOrderSnapshot(orderId: string): Promise<SnapshotResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your sign-in has expired. Sign in again.' }

  // RLS scopes every read below to the caller's own customer.
  const { data: o, error } = await supabase
    .from('orders')
    .select(
      `
      id, status, client_po, end_customer_name, quantity, size_spec, finish_point, description, submission_notes,
      engraving_text, engraving_use_logo, engraving_logo_position, engraving_text_position,
      shipping_method, ship_to_recipient_name, ship_to_address_line1, ship_to_address_line2, ship_to_city,
      ship_to_state, ship_to_postal_code, ship_to_country, ship_to_phone, has_center_stones, has_accent_stones,
      product_type:product_types!product_type_id (short_code, name)
      `,
    )
    .eq('id', orderId)
    .maybeSingle()
  if (error) {
    console.error('[orderSnapshot] order read failed:', error.message)
    return { ok: false, error: 'Order not found.' }
  }
  if (!o) return { ok: false, error: 'Order not found.' }
  if (o.status !== 'draft') {
    return { ok: false, error: 'This order can no longer be submitted (status changed). Refresh to see current state.' }
  }

  const [metalsRes, centersRes, accentsRes, meRes] = await Promise.all([
    supabase
      .from('order_metals')
      .select('area, finish, display_order, metal:metals!metal_id (name, karat, color, base_metal)')
      .eq('order_id', orderId)
      .order('display_order', { ascending: true }),
    supabase
      .from('order_center_stones')
      .select(
        `
        supply_source, carat_min, carat_max, color_min, color_max, clarity_min, clarity_max, make_min, make_max,
        certification, length_mm, width_mm, depth_mm, custom_stone_type_name, display_order,
        stone_type:stone_types!stone_type_id (name, category),
        stone_shape:stone_shapes!stone_shape_id (name)
        `,
      )
      .eq('order_id', orderId)
      .order('display_order', { ascending: true }),
    supabase
      .from('order_accent_stones')
      .select('supply_source, quality_color, quality_clarity, display_order, stone_type:stone_types!stone_type_id (name, category)')
      .eq('order_id', orderId)
      .order('display_order', { ascending: true }),
    supabase.from('users').select('full_name').eq('id', user.id).maybeSingle(),
  ])
  const childError = metalsRes.error ?? centersRes.error ?? accentsRes.error
  if (childError) {
    console.error('[orderSnapshot] child read failed:', childError.message)
    return { ok: false, error: 'The order could not be read just now. Try again.' }
  }

  const productType = one(o.product_type as { short_code: string; name: string } | { short_code: string; name: string }[] | null)
  const snapshot: OrderSnapshot = {
    portal_order_id: o.id as string,
    submitted_by_name: s(meRes.data?.full_name).trim() || s(user.email),
    client_po: o.client_po ?? null,
    end_customer_name: o.end_customer_name ?? null,
    product_type_code: productType?.short_code ?? null,
    product_type_name: productType?.name ?? null,
    size_spec: o.size_spec ?? null,
    quantity: typeof o.quantity === 'number' ? o.quantity : 1,
    finish_point: o.finish_point ?? null,
    description: o.description ?? null,
    submission_notes: o.submission_notes ?? null,
    engraving_text: o.engraving_text ?? null,
    engraving_text_position: o.engraving_text_position ?? null,
    engraving_use_logo: o.engraving_use_logo === true,
    engraving_logo_position: o.engraving_logo_position ?? null,
    shipping_method: o.shipping_method ?? null,
    ship_to: {
      recipient: s(o.ship_to_recipient_name),
      line1: s(o.ship_to_address_line1),
      line2: s(o.ship_to_address_line2),
      city: s(o.ship_to_city),
      state: s(o.ship_to_state),
      postal: s(o.ship_to_postal_code),
      country: s(o.ship_to_country) || 'US',
      phone: s(o.ship_to_phone),
    },
    has_center_stones: o.has_center_stones ?? null,
    has_accent_stones: o.has_accent_stones ?? null,
    metals: (metalsRes.data ?? []).map((r: any) => {
      const m = one(r.metal) as { name: string; karat: number | null; color: string | null; base_metal: string | null } | null
      return { name: m?.name ?? null, karat: m?.karat ?? null, color: m?.color ?? null, base_metal: m?.base_metal ?? null, area: r.area ?? null, finish: r.finish ?? null }
    }),
    center_stones: (centersRes.data ?? []).map((r: any) => {
      const t = one(r.stone_type) as { name: string; category: string } | null
      const sh = one(r.stone_shape) as { name: string } | null
      return {
        stone_type: t?.name ?? null,
        category: t?.category ?? null,
        custom_name: r.custom_stone_type_name ?? null,
        shape: sh?.name ?? null,
        supply: r.supply_source ?? null,
        carat_min: r.carat_min ?? null,
        carat_max: r.carat_max ?? null,
        color_min: r.color_min ?? null,
        color_max: r.color_max ?? null,
        clarity_min: r.clarity_min ?? null,
        clarity_max: r.clarity_max ?? null,
        make_min: r.make_min ?? null,
        make_max: r.make_max ?? null,
        certification: Array.isArray(r.certification) ? r.certification : [],
        length_mm: r.length_mm ?? null,
        width_mm: r.width_mm ?? null,
        depth_mm: r.depth_mm ?? null,
      }
    }),
    accent_stones: (accentsRes.data ?? []).map((r: any) => {
      const t = one(r.stone_type) as { name: string; category: string } | null
      return { stone_type: t?.name ?? null, category: t?.category ?? null, supply: r.supply_source ?? null, quality_color: r.quality_color ?? null, quality_clarity: r.quality_clarity ?? null }
    }),
  }
  return { ok: true, snapshot }
}
