/**
 * Seeds the demo order DG-10001 ("Lauren" — custom oval engagement ring)
 * into Supabase. Mirrors the Phase 1 mock in src/lib/mock/order.ts so the
 * order detail page renders identically once it switches from mock to DB.
 *
 * Usage:
 *   npm run seed:dg-10001            # idempotent; exits if already seeded
 *   npm run seed:dg-10001 -- --reset # wipes the order and re-seeds
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Service-role key bypasses RLS — never ship this script's keys to the client.
 */

// Load env BEFORE any other import that might read process.env.
// First line loads .env automatically; explicit config call layers .env.local on top.
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Setup ────────────────────────────────────────────────────────────────

const RESET = process.argv.slice(2).includes('--reset')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  )
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ORDER_NUMBER = 'DG-10001'
const DUMMY_PASSWORD = 'devseedpw'

// ─── Helpers ──────────────────────────────────────────────────────────────

const toCents = (dollars: number) => Math.round(dollars * 100)

function mimeForUrl(url: string): string {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg'
  if (url.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

function basename(url: string): string {
  return url.split('/').pop() ?? url
}

async function lookupId(
  table: string,
  column: string,
  value: string,
): Promise<string> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(column, value)
    .single()
  if (error || !data) {
    throw new Error(`Lookup failed: ${table}.${column} = "${value}" → ${error?.message ?? 'no row'}`)
  }
  return data.id as string
}

async function getOrCreateAuthUser(
  email: string,
): Promise<string> {
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password: DUMMY_PASSWORD,
      email_confirm: true,
    })
  if (created?.user) return created.user.id

  // Fallback: user already exists. Paginate listUsers to find by email.
  // For a seed script with <10 users this single page is enough.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) throw listErr
  const found = list?.users.find((u) => u.email === email)
  if (!found) {
    throw new Error(
      `createUser failed AND no existing user with email ${email}: ${createErr?.message}`,
    )
  }
  return found.id
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  // 1. Existence check
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('order_number', ORDER_NUMBER)
    .maybeSingle()

  if (existingOrder && !RESET) {
    console.log(
      `${ORDER_NUMBER} already seeded (id ${existingOrder.id}). Use --reset to wipe and reseed.`,
    )
    return
  }

  if (existingOrder && RESET) {
    console.log(`--reset: deleting existing ${ORDER_NUMBER} (id ${existingOrder.id})`)

    // Several FKs into cad_versions / order_metals are NO ACTION (intentional,
    // to protect production data). They block the orders cascade unless we
    // clear them first:
    //   - cad_version_metal_weights.order_metal_id   → order_metals  (NO ACTION)
    //   - order_history_events.related_cad_version_id → cad_versions (NO ACTION)
    //   - order_attachments.related_cad_version_id    → cad_versions (NO ACTION)
    //   - order_attachments.related_event_id          → order_history_events (NO ACTION)
    // Delete in this order to satisfy all of them.

    // Step 1: find all cad_versions for this order.
    const { data: versionsToWipe, error: versionsErr } = await supabase
      .from('cad_versions')
      .select('id')
      .eq('order_id', existingOrder.id)
    if (versionsErr) throw versionsErr
    const versionIds = (versionsToWipe ?? []).map((v) => v.id as string)

    // Step 2: cad_version_metal_weights for those versions.
    if (versionIds.length > 0) {
      const { error: weightsErr } = await supabase
        .from('cad_version_metal_weights')
        .delete()
        .in('cad_version_id', versionIds)
      if (weightsErr) throw weightsErr
      console.log(`  Deleted cad_version_metal_weights for ${versionIds.length} versions`)
    }

    // Step 3: order_attachments (may reference both cad_versions and events).
    const { error: attErr } = await supabase
      .from('order_attachments')
      .delete()
      .eq('order_id', existingOrder.id)
    if (attErr) throw attErr
    console.log('  Deleted order_attachments')

    // Step 4: order_history_events (reference cad_versions).
    const { error: histErr } = await supabase
      .from('order_history_events')
      .delete()
      .eq('order_id', existingOrder.id)
    if (histErr) throw histErr
    console.log('  Deleted order_history_events')

    // Step 5: delete the order — cascade now handles cad_versions, metals, stones cleanly.
    const { error: delErr } = await supabase
      .from('orders')
      .delete()
      .eq('id', existingOrder.id)
    if (delErr) throw delErr
    console.log(`  Deleted order ${existingOrder.id} (cascade dropped cad_versions, metals, stones)`)
  }

  // 2. Master data lookups (never hard-code these UUIDs)
  console.log('Looking up master data IDs…')
  const productTypeRingId = await lookupId('product_types', 'short_code', 'R')
  const metal14kYGId = await lookupId('metals', 'short_code', '14kYG')
  const naturalDiamondId = await lookupId('stone_types', 'name', 'Natural Diamond')
  const labDiamondId = await lookupId('stone_types', 'name', 'Lab-Grown Diamond')
  const blueSapphireId = await lookupId('stone_types', 'name', 'Blue Sapphire')
  const ovalShapeId = await lookupId('stone_shapes', 'name', 'Oval')
  const roundShapeId = await lookupId('stone_shapes', 'name', 'Round')
  const prongStyleId = await lookupId('setting_styles', 'name', 'Prong')
  const bezelStyleId = await lookupId('setting_styles', 'name', 'Bezel')
  console.log('  ✓ master IDs resolved')

  // 3. Auth users (Priya = AM, Marcus = customer rep)
  console.log('Creating/looking up auth users…')
  const priyaUserId = await getOrCreateAuthUser('priya@diaco.test')
  console.log(`  ✓ priya@diaco.test → ${priyaUserId}`)
  const marcusUserId = await getOrCreateAuthUser('marcus@heritage.test')
  console.log(`  ✓ marcus@heritage.test → ${marcusUserId}`)

  // 4. Insert Priya into public.users FIRST (customer's assigned_am_id needs her)
  console.log('Upserting public.users for Priya (AM)…')
  {
    const { error } = await supabase.from('users').upsert(
      {
        id: priyaUserId,
        email: 'priya@diaco.test',
        user_type: 'am',
        full_name: 'Priya Anand',
        status: 'active',
      },
      { onConflict: 'id' },
    )
    if (error) throw error
  }
  console.log(`  ✓ users.Priya Anand (${priyaUserId})`)

  // 5. Customer
  console.log('Upserting customer…')
  let customerId: string
  {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('name', 'Heritage Fine Jewelers')
      .maybeSingle()
    if (existing) {
      customerId = existing.id
      const { error } = await supabase
        .from('customers')
        .update({ assigned_am_id: priyaUserId })
        .eq('id', customerId)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: 'Heritage Fine Jewelers',
          status: 'active',
          assigned_am_id: priyaUserId,
          phone: '(503) 555-0142',
          billing_address_line1: '1847 NW 23rd Ave',
          billing_city: 'Portland',
          billing_state: 'OR',
          billing_postal_code: '97210',
          billing_country: 'US',
        })
        .select('id')
        .single()
      if (error) throw error
      customerId = data.id
    }
  }
  console.log(`  ✓ customer Heritage Fine Jewelers (${customerId})`)

  // 6. Insert Marcus (customer_rep) — needs customer_id
  console.log('Upserting public.users for Marcus (customer rep)…')
  {
    const { error } = await supabase.from('users').upsert(
      {
        id: marcusUserId,
        email: 'marcus@heritage.test',
        user_type: 'customer_rep',
        customer_id: customerId,
        customer_rep_role: 'primary',
        full_name: 'Marcus Bennett',
        status: 'active',
      },
      { onConflict: 'id' },
    )
    if (error) throw error
  }
  console.log(`  ✓ users.Marcus Bennett (${marcusUserId})`)

  // 7. Order
  console.log('Inserting order…')
  let orderId: string
  {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: ORDER_NUMBER,
        style_number: '200001-R',
        client_po: 'HFJ-Bennett-1018',
        end_customer_name: 'Lauren',
        customer_id: customerId,
        submitted_by_user_id: marcusUserId,
        assigned_am_id: priyaUserId,
        product_type_id: productTypeRingId,
        description:
          'Oval solitaire setting for a 4.30ct oval brilliant. Slim band with prong-set oval lab-grown diamond accents (3.00 cttw, E/F VVS) running along the shoulders. Subtle bezel-set sapphire detail. Mid-century inspired, clean profile. End customer (Lauren) is bringing the center stone; Dia-Co supplies all accents.',
        finish_point: 'finished_piece',
        size_spec: '6.5',
        quantity: 1,
        engraving_text: '[my logo]',
        status: 'designing',
        sub_status: 'awaiting_review',
        priority_rush: false,
        priority_rush_status: 'not_requested',
        ship_to_recipient_name: 'Lauren M.',
        ship_to_address_line1: '1240 Orange Grove Ave',
        ship_to_city: 'Pasadena',
        ship_to_state: 'CA',
        ship_to_postal_code: '91103',
        ship_to_country: 'US',
        ship_to_insured_value_cents: toCents(28500),
        submitted_at: '2026-03-14T11:08:00-07:00',
      })
      .select('id')
      .single()
    if (error) throw error
    orderId = data.id
  }
  console.log(`  ✓ order ${ORDER_NUMBER} (${orderId})`)

  // 8. order_metals
  console.log('Inserting order_metals…')
  let bandMetalId: string
  {
    const { data, error } = await supabase
      .from('order_metals')
      .insert({
        order_id: orderId,
        metal_id: metal14kYGId,
        area: 'band',
        display_order: 0,
      })
      .select('id')
      .single()
    if (error) throw error
    bandMetalId = data.id
  }
  console.log(`  ✓ order_metals.band 14kYG (${bandMetalId})`)

  // 9. order_center_stones
  console.log('Inserting order_center_stones…')
  {
    const { error } = await supabase.from('order_center_stones').insert({
      order_id: orderId,
      display_order: 0,
      quantity: 1,
      stone_type_id: naturalDiamondId,
      stone_shape_id: ovalShapeId,
      carat_each: 4.3,
      carat_total_weight: 4.3,
      quality_color: 'F',
      quality_clarity: 'VS1',
      supply_source: 'customer',
      certification_lab: 'GIA',
      certification_number: '4892711',
      setting_style_id: prongStyleId,
    })
    if (error) throw error
  }
  console.log('  ✓ order_center_stones (4.30ct oval natural diamond)')

  // 10. order_accent_stones
  console.log('Inserting order_accent_stones…')
  {
    const { error } = await supabase.from('order_accent_stones').insert([
      {
        order_id: orderId,
        group_label: 'side stones',
        display_order: 0,
        stone_type_id: labDiamondId,
        stone_shape_id: ovalShapeId,
        quantity: 12,
        size_mm: 5.3,
        carat_each: 0.25,
        carat_total_weight: 3.0,
        quality_color: 'E/F',
        quality_clarity: 'VVS',
        supply_source: 'diaco',
        customer_stone_notes: 'Prong-set along the band',
        setting_style_id: prongStyleId,
      },
      {
        order_id: orderId,
        group_label: 'accent',
        display_order: 1,
        stone_type_id: blueSapphireId,
        stone_shape_id: roundShapeId,
        quantity: 4,
        size_mm: 2.0,
        carat_each: 0.0125,
        carat_total_weight: 0.05,
        supply_source: 'diaco',
        customer_stone_notes: 'Bezel-set accent',
        setting_style_id: bezelStyleId,
      },
    ])
    if (error) throw error
  }
  console.log('  ✓ order_accent_stones (lab-diamond ×12, sapphire ×4)')

  // 10b. order_attachments — customer-uploaded submission references.
  // Mock URLs are local placeholders (/mock/attachments/...); swap for real
  // Supabase Storage URLs once upload flow is wired.
  console.log('Inserting order_attachments…')
  {
    const submittedAt = '2026-03-14T11:08:00-07:00'
    const { error } = await supabase.from('order_attachments').insert([
      {
        order_id: orderId,
        purpose: 'submission_reference',
        source: 'customer',
        uploaded_by_user_id: marcusUserId,
        file_url: 'https://placeholder.local/reference_inspiration.jpg',
        original_filename: 'reference_inspiration.jpg',
        file_size_bytes: 2_516_582,
        mime_type: 'image/jpeg',
        is_customer_visible: true,
        created_at: submittedAt,
      },
      {
        order_id: orderId,
        purpose: 'submission_reference',
        source: 'customer',
        uploaded_by_user_id: marcusUserId,
        file_url: 'https://placeholder.local/sketch_main.pdf',
        original_filename: 'sketch_main.pdf',
        file_size_bytes: 860_160,
        mime_type: 'application/pdf',
        is_customer_visible: true,
        created_at: submittedAt,
      },
    ])
    if (error) throw error
  }
  console.log('  ✓ order_attachments (reference_inspiration.jpg, sketch_main.pdf)')

  // 11. cad_versions v2 and v3
  console.log('Inserting cad_versions…')
  const threeDViewerUrl = 'https://www.your-jewelry.com/?id=WvEExDO3T-aT3uCIIZ1M8w'
  const v2DeliveredAt = '2026-03-17T10:35:00-07:00'
  const v3DeliveredAt = '2026-03-18T09:42:00-07:00'
  const v2CustomerActionAt = '2026-03-17T15:42:00-07:00' // evt_005 timestamp
  const v2ModRequestText =
    "Center reads a bit small now against the band. Let's go back to 4.30ct on the center, bump accents to ~3.00cttw, and try the shank at 1.6mm."

  let v2Id: string
  let v3Id: string
  {
    const { data, error } = await supabase
      .from('cad_versions')
      .insert([
        {
          order_id: orderId,
          version_number: 2,
          designer_internal_name: 'Priya Anand',
          delivery_note:
            'Center reduced to 3.04ct oval, accents to 2.33cttw (4.65 × 3.30mm), shank thinned to 1.8mm.',
          three_d_viewer_url: threeDViewerUrl,
          delivered_at: v2DeliveredAt,
          customer_action: 'modification_requested',
          customer_action_at: v2CustomerActionAt,
          customer_action_by_user_id: marcusUserId,
          modification_request_text: v2ModRequestText,
          finish_point: 'finished_piece',
          quantity: 1,
          size_spec: '6.5',
          engraving_text: '[my logo]',
        },
        {
          order_id: orderId,
          version_number: 3,
          designer_internal_name: 'Priya Anand',
          delivery_note:
            'Band at 1.6mm as requested. Quote holds at $1,654.10 all in.',
          three_d_viewer_url: threeDViewerUrl,
          delivered_at: v3DeliveredAt,
          finish_point: 'finished_piece',
          quantity: 1,
          size_spec: '6.5',
          engraving_text: '[my logo]',
        },
      ])
      .select('id, version_number')
    if (error) throw error
    v2Id = data.find((v) => v.version_number === 2)!.id
    v3Id = data.find((v) => v.version_number === 3)!.id
  }
  console.log(`  ✓ cad_versions v2 (${v2Id}), v3 (${v3Id})`)

  // 12. cad_version_renders
  console.log('Inserting cad_version_renders…')
  const rendersV2 = [
    { url: '/mock/cad/PO-10847-v2-1.jpg', role: 'hero', label: 'Main' },
    { url: '/mock/cad/PO-10847-v2-2.jpg', role: 'render', label: 'Front' },
    { url: '/mock/cad/PO-10847-v2-3.jpg', role: 'render', label: 'Profile' },
    { url: '/mock/cad/PO-10847-v2-6.jpg', role: 'render', label: 'On hand' },
    { url: '/mock/cad/PO-10847-v2-9.png', role: 'setting_map', label: 'Setting detail' },
  ]
  const rendersV3 = [
    { url: '/mock/cad/PO-10847-v3-1.jpg', role: 'hero', label: 'Main' },
    { url: '/mock/cad/PO-10847-v3-3.jpg', role: 'render', label: 'Profile' },
    { url: '/mock/cad/PO-10847-v3-4.jpg', role: 'render', label: 'Side' },
    { url: '/mock/cad/PO-10847-v3-6.jpg', role: 'render', label: 'On hand' },
    { url: '/mock/cad/PO-10847-v3-9.png', role: 'setting_map', label: 'Setting detail' },
  ]
  const renderRows = [
    ...rendersV2.map((r, i) => ({
      cad_version_id: v2Id,
      image_url: r.url,
      image_role: r.role,
      display_order: i,
      mime_type: mimeForUrl(r.url),
      original_filename: basename(r.url),
    })),
    ...rendersV3.map((r, i) => ({
      cad_version_id: v3Id,
      image_url: r.url,
      image_role: r.role,
      display_order: i,
      mime_type: mimeForUrl(r.url),
      original_filename: basename(r.url),
    })),
  ]
  {
    const { error } = await supabase.from('cad_version_renders').insert(renderRows)
    if (error) throw error
  }
  console.log(`  ✓ cad_version_renders (${renderRows.length} rows)`)

  // 13. cad_version_metal_weights (different per version)
  console.log('Inserting cad_version_metal_weights…')
  {
    const { error } = await supabase.from('cad_version_metal_weights').insert([
      { cad_version_id: v2Id, order_metal_id: bandMetalId, weight_grams: 3.8 },
      { cad_version_id: v3Id, order_metal_id: bandMetalId, weight_grams: 4.2 },
    ])
    if (error) throw error
  }
  console.log('  ✓ cad_version_metal_weights (v2 3.8g, v3 4.2g)')

  // 14. cad_version_center_stones (snapshots) — same spec across v2/v3 per task
  console.log('Inserting cad_version_center_stones (snapshots)…')
  {
    const centerSnap = {
      display_order: 0,
      quantity: 1,
      stone_type_id: naturalDiamondId,
      stone_shape_id: ovalShapeId,
      carat_each: 4.3,
      carat_total_weight: 4.3,
      quality_color: 'F',
      quality_clarity: 'VS1',
      supply_source: 'customer' as const,
      setting_style_id: prongStyleId,
    }
    const { error } = await supabase.from('cad_version_center_stones').insert([
      { cad_version_id: v2Id, ...centerSnap },
      { cad_version_id: v3Id, ...centerSnap },
    ])
    if (error) throw error
  }
  console.log('  ✓ cad_version_center_stones (2 snapshots)')

  // 15. cad_version_accent_stones (snapshots)
  console.log('Inserting cad_version_accent_stones (snapshots)…')
  {
    const labAccent = {
      group_label: 'side stones',
      display_order: 0,
      stone_type_id: labDiamondId,
      stone_shape_id: ovalShapeId,
      quantity: 12,
      size_mm: 5.3,
      carat_each: 0.25,
      carat_total_weight: 3.0,
      quality_color: 'E/F',
      quality_clarity: 'VVS',
      supply_source: 'diaco' as const,
      setting_style_id: prongStyleId,
    }
    const sapphireAccent = {
      group_label: 'accent',
      display_order: 1,
      stone_type_id: blueSapphireId,
      stone_shape_id: roundShapeId,
      quantity: 4,
      size_mm: 2.0,
      carat_each: 0.0125,
      carat_total_weight: 0.05,
      supply_source: 'diaco' as const,
      setting_style_id: bezelStyleId,
    }
    const { error } = await supabase.from('cad_version_accent_stones').insert([
      { cad_version_id: v2Id, ...labAccent },
      { cad_version_id: v2Id, ...sapphireAccent },
      { cad_version_id: v3Id, ...labAccent },
      { cad_version_id: v3Id, ...sapphireAccent },
    ])
    if (error) throw error
  }
  console.log('  ✓ cad_version_accent_stones (4 snapshots)')

  // 16. cad_version_quote_lines — reproduce mock totals v2 $1,421.15 / v3 $1,654.10
  console.log('Inserting cad_version_quote_lines…')
  type QL = {
    line_type: string
    description: string
    quantity: number | null
    unit: string | null
    unit_price_cents: number | null
    line_total_cents: number
    group_label: string | null
    display_order: number
  }
  const v2Lines: QL[] = [
    { line_type: 'designing', description: 'CAD', quantity: 1, unit: null, unit_price_cents: toCents(149), line_total_cents: toCents(149), group_label: null, display_order: 0 },
    { line_type: 'wax', description: 'Wax', quantity: 1, unit: null, unit_price_cents: toCents(25), line_total_cents: toCents(25), group_label: null, display_order: 1 },
    { line_type: 'metal', description: '14k yellow gold — Metal + casting + cleaning', quantity: 3.8, unit: 'g', unit_price_cents: toCents(108), line_total_cents: toCents(410.4), group_label: null, display_order: 2 },
    { line_type: 'stones', description: 'Lab-grown diamond accents — E/F · VVS', quantity: 2.33, unit: 'ct', unit_price_cents: toCents(225), line_total_cents: toCents(524.25), group_label: 'Stones', display_order: 3 },
    { line_type: 'stones', description: 'Sapphire accents', quantity: 0.05, unit: 'ct', unit_price_cents: toCents(350), line_total_cents: toCents(17.5), group_label: 'Stones', display_order: 4 },
    { line_type: 'setting', description: 'Prong — Center — 3.04ct Oval', quantity: 1, unit: 'stones', unit_price_cents: toCents(80), line_total_cents: toCents(80), group_label: 'Setting', display_order: 5 },
    { line_type: 'setting', description: 'Prong — 4.65mm Oval lab grown', quantity: 12, unit: 'stones', unit_price_cents: toCents(7.5), line_total_cents: toCents(90), group_label: 'Setting', display_order: 6 },
    { line_type: 'setting', description: 'Bezel — 2.0mm Round sapphire', quantity: 4, unit: 'stones', unit_price_cents: toCents(5), line_total_cents: toCents(20), group_label: 'Setting', display_order: 7 },
    { line_type: 'polishing', description: 'Polishing & Finishing — High polish', quantity: 1, unit: null, unit_price_cents: toCents(35), line_total_cents: toCents(35), group_label: null, display_order: 8 },
    { line_type: 'engraving', description: 'Logo engraving — Inside band', quantity: 1, unit: null, unit_price_cents: toCents(25), line_total_cents: toCents(25), group_label: null, display_order: 9 },
    { line_type: 'shipping', description: 'Drop shipping — Insured · Pasadena CA · $28,500 declared', quantity: 1, unit: null, unit_price_cents: toCents(45), line_total_cents: toCents(45), group_label: null, display_order: 10 },
  ]
  const v3Lines: QL[] = [
    { line_type: 'designing', description: 'CAD', quantity: 1, unit: null, unit_price_cents: toCents(149), line_total_cents: toCents(149), group_label: null, display_order: 0 },
    { line_type: 'wax', description: 'Wax', quantity: 1, unit: null, unit_price_cents: toCents(25), line_total_cents: toCents(25), group_label: null, display_order: 1 },
    { line_type: 'metal', description: '14k yellow gold — Metal + casting + cleaning', quantity: 4.2, unit: 'g', unit_price_cents: toCents(108), line_total_cents: toCents(453.6), group_label: null, display_order: 2 },
    { line_type: 'stones', description: 'Lab-grown diamond accents — E/F · VVS', quantity: 3.0, unit: 'ct', unit_price_cents: toCents(225), line_total_cents: toCents(675), group_label: 'Stones', display_order: 3 },
    { line_type: 'stones', description: 'Sapphire accents', quantity: 0.05, unit: 'ct', unit_price_cents: toCents(350), line_total_cents: toCents(17.5), group_label: 'Stones', display_order: 4 },
    { line_type: 'setting', description: 'Prong — Center — 4.30ct Oval', quantity: 1, unit: 'stones', unit_price_cents: toCents(95), line_total_cents: toCents(95), group_label: 'Setting', display_order: 5 },
    { line_type: 'setting', description: 'Prong — 5.3mm Oval lab grown', quantity: 12, unit: 'stones', unit_price_cents: toCents(9.5), line_total_cents: toCents(114), group_label: 'Setting', display_order: 6 },
    { line_type: 'setting', description: 'Bezel — 2.0mm Round sapphire', quantity: 4, unit: 'stones', unit_price_cents: toCents(5), line_total_cents: toCents(20), group_label: 'Setting', display_order: 7 },
    { line_type: 'polishing', description: 'Polishing & Finishing — High polish', quantity: 1, unit: null, unit_price_cents: toCents(35), line_total_cents: toCents(35), group_label: null, display_order: 8 },
    { line_type: 'engraving', description: 'Logo engraving — Inside band', quantity: 1, unit: null, unit_price_cents: toCents(25), line_total_cents: toCents(25), group_label: null, display_order: 9 },
    { line_type: 'shipping', description: 'Drop shipping — Insured · Pasadena CA · $28,500 declared', quantity: 1, unit: null, unit_price_cents: toCents(45), line_total_cents: toCents(45), group_label: null, display_order: 10 },
  ]
  {
    const rows = [
      ...v2Lines.map((l) => ({ cad_version_id: v2Id, ...l })),
      ...v3Lines.map((l) => ({ cad_version_id: v3Id, ...l })),
    ]
    const { error } = await supabase.from('cad_version_quote_lines').insert(rows)
    if (error) throw error
    const v2Sum = v2Lines.reduce((s, l) => s + l.line_total_cents, 0)
    const v3Sum = v3Lines.reduce((s, l) => s + l.line_total_cents, 0)
    console.log(
      `  ✓ cad_version_quote_lines (v2 sum $${(v2Sum / 100).toFixed(2)}, v3 sum $${(v3Sum / 100).toFixed(2)})`,
    )
  }

  // 17. order_history_events — 6 events from mock
  console.log('Inserting order_history_events…')
  const events = [
    {
      event_type: 'order_submitted',
      actor_side: 'customer',
      actor_user_id: marcusUserId,
      actor_display_name: 'Marcus Bennett',
      summary: 'Order submitted with 2 references',
      payload: {
        body: '"Oval solitaire with oval diamond accents along the band, plus subtle sapphire detail. Customer bringing the 4.30ct oval center."',
      },
      related_cad_version_id: null,
      created_at: '2026-03-14T11:08:00-07:00',
    },
    {
      event_type: 'cad_delivered',
      actor_side: 'diaco',
      actor_user_id: priyaUserId,
      actor_display_name: 'Priya Anand',
      summary: 'CAD v1 delivered',
      payload: {
        version_number: 1,
        body: 'First pass — sent on a 1.8mm band with oval lab-grown diamonds set in shared prongs. Let us know how the proportions look against the 4.30ct center.',
      },
      // No v1 row in cad_versions (Phase 1 mock only kept v2 + v3).
      related_cad_version_id: null,
      created_at: '2026-03-15T16:20:00-07:00',
    },
    {
      event_type: 'modification_requested',
      actor_side: 'customer',
      actor_user_id: marcusUserId,
      actor_display_name: 'Marcus Bennett',
      summary: 'Modification requested',
      payload: {
        version_number: 1,
        body: "Like the direction. Two changes: tighten the spacing between accents and let's go a touch smaller on the center — see how 3ct reads.",
      },
      related_cad_version_id: null,
      created_at: '2026-03-16T10:14:00-07:00',
    },
    {
      event_type: 'cad_delivered',
      actor_side: 'diaco',
      actor_user_id: priyaUserId,
      actor_display_name: 'Priya Anand',
      summary: 'CAD v2 delivered · quote updated',
      payload: {
        version_number: 2,
        body: 'Center reduced to 3.04ct oval, accents to 2.33cttw (4.65 × 3.30mm), shank thinned to 1.8mm. New quote: $1,421.15.',
      },
      related_cad_version_id: v2Id,
      created_at: v2DeliveredAt,
    },
    {
      event_type: 'modification_requested',
      actor_side: 'customer',
      actor_user_id: marcusUserId,
      actor_display_name: 'Marcus Bennett',
      summary: 'Modification requested',
      payload: { version_number: 2, body: v2ModRequestText },
      related_cad_version_id: v2Id,
      created_at: v2CustomerActionAt,
    },
    {
      event_type: 'cad_delivered',
      actor_side: 'diaco',
      actor_user_id: priyaUserId,
      actor_display_name: 'Priya Anand',
      summary: 'CAD v3 delivered · quote updated · ready for approval',
      payload: {
        version_number: 3,
        body: 'Center back to 4.30ct, accents at 3.00cttw (5.30 × 3.50mm), shank at 1.6mm. Quote: $1,654.10 all in.',
      },
      related_cad_version_id: v3Id,
      created_at: v3DeliveredAt,
    },
  ].map((e) => ({ order_id: orderId, is_customer_visible: true, ...e }))

  {
    const { error } = await supabase.from('order_history_events').insert(events)
    if (error) throw error
  }
  console.log(`  ✓ order_history_events (${events.length} rows)`)

  console.log('')
  console.log(`Done. Seeded ${ORDER_NUMBER} (${orderId}).`)
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message ?? err)
  if (err.details) console.error('  details:', err.details)
  if (err.hint) console.error('  hint:', err.hint)
  process.exit(1)
})
