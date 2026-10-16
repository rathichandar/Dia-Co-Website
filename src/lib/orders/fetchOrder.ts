// ============================================================
// fetchOrder — loads an order from Supabase and maps it to the
// existing Order type so Phase 1 components render unchanged.
//
// Single round-trip via PostgREST nested select. RLS-respecting:
// uses the server Supabase client (cookie-bound to the request).
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type {
  AccentStoneGroup,
  AccountManager,
  AccountManagerId,
  Actor,
  ActorSide,
  Address,
  Attachment,
  CadRender,
  CadVersion,
  CenterStoneDetail,
  Customer,
  CustomerId,
  DesigningSubState,
  DesigningActionNeeded,
  EngravingSpec,
  FileType,
  HistoryEvent,
  HistoryEventReference,
  HistoryEventType,
  MetalColorId,
  MetalKaratId,
  MetalSpec,
  Order,
  OrderId,
  PriorityRush,
  PriorityRushEligibility,
  ProductType,
  Quote,
  QuoteLineItem,
  ShapeId,
  ShippingSpec,
  Stage,
  StageDetail,
  StoneSupply,
  StoneTypeId,
} from '@/types/order'

// ─── Small helpers ────────────────────────────────────────────

const centsToDollars = (cents: number | null | undefined): number =>
  cents == null ? 0 : cents / 100

const toDate = (s: string | null | undefined): Date =>
  s ? new Date(s) : new Date(0)

const toDateOrNull = (s: string | null | undefined): Date | null =>
  s ? new Date(s) : null

const initials = (name: string | null | undefined): string =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .join('')
    .slice(0, 3)

const brand = <T>(s: string): T => s as unknown as T

// Combine schema's separate color/clarity columns into the mock's "F · VS1" form.
function joinColorClarity(
  color: string | null,
  clarity: string | null,
): string | null {
  if (color && clarity) return `${color} · ${clarity}`
  return color ?? clarity ?? null
}

// Combine separate cert lab + number into "GIA #4892711".
function formatCert(lab: string | null, num: string | null): string | null {
  if (lab && num) return `${lab} #${num}`
  return lab ?? num ?? null
}

function mimeToFileType(mime: string | null | undefined): FileType {
  if (!mime) return 'other'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('model/') || mime.includes('stl') || mime.includes('3dm')) {
    return 'cad_file'
  }
  return 'other'
}

function parseSizeSpec(
  spec: string | null,
): { value: number; unit: 'US' | 'EU' | 'mm' } | null {
  if (!spec) return null
  const num = Number(spec)
  return Number.isFinite(num) ? { value: num, unit: 'US' } : null
}

// ─── Mapping helpers (enum / category translations) ──────────

function mapProductTypeName(name: string | null | undefined): ProductType {
  switch ((name ?? '').toLowerCase()) {
    case 'ring':
      return 'ring'
    case 'earring':
      return 'earrings'
    case 'pendant':
      return 'pendant'
    case 'necklace':
      return 'necklace'
    case 'bracelet':
      return 'bracelet'
    default:
      return 'other'
  }
}

function mapStage(status: string): Stage {
  switch (status) {
    case 'in_production':
      return 'production'
    case 'approved':
      // Mock has no 'approved' stage. UI lives between designing and production.
      return 'designing'
    case 'on_hold':
      return 'designing' // best-effort; mock has no on_hold stage
    case 'draft':
    case 'designing':
    case 'qc':
    case 'shipping':
    case 'cancelled':
      return status as Stage
    default:
      return 'designing'
  }
}

function mapSubStatus(sub: string | null): DesigningSubState {
  switch (sub) {
    case 'awaiting_design':
      return 'awaiting_first_cad'
    case 'awaiting_review':
      return 'awaiting_customer_review'
    case 'redesigning':
      return 'awaiting_modifications'
    default:
      return 'awaiting_customer_review'
  }
}

function mapActionNeeded(sub: string | null): DesigningActionNeeded {
  if (sub === 'awaiting_review') return 'approve_cad'
  if (sub === 'redesigning') return 'review_modifications'
  return null
}

function mapPriorityRushEligibility(s: string | null): PriorityRushEligibility {
  switch (s) {
    case 'requested':
      return 'requested_pending_review'
    case 'approved_by_am':
      return 'approved'
    case 'denied':
      return 'denied'
    default:
      return 'not_requested'
  }
}

function mapHistoryEventType(t: string): HistoryEventType | null {
  switch (t) {
    case 'order_submitted':
    case 'cad_delivered':
    case 'modification_requested':
    case 'cancelled':
    case 'priority_rush_requested':
    case 'priority_rush_approved':
    case 'priority_rush_denied':
      return t as HistoryEventType
    case 'cad_approved':
      return 'approved'
    case 'status_changed':
      return 'stage_changed'
    case 'shipped':
      return 'ship_date_changed'
    default:
      // on_hold, resumed, internal_note → no mock equivalent; caller filters
      return null
  }
}

// Mock's QuoteLineCategory ← schema's quote_line_type, factoring in group_label
function mapQuoteCategory(
  lineType: string,
  groupLabel: string | null,
): QuoteLineItem['category'] {
  if (groupLabel === 'Stones') return 'stones_subitem'
  if (groupLabel === 'Setting') return 'setting_subitem'
  switch (lineType) {
    case 'designing':
      return 'cad'
    case 'wax':
      return 'wax'
    case 'metal':
      return 'metal'
    case 'polishing':
      return 'finishing'
    case 'engraving':
      return 'engraving'
    case 'shipping':
      return 'shipping'
    case 'setting':
      return 'setting_subitem'
    case 'stones':
      return 'stones_subitem'
    default:
      return 'other'
  }
}

function mapUnit(unit: string | null): QuoteLineItem['qtyUnit'] {
  switch (unit) {
    case 'g':
      return 'g'
    case 'ct':
      return 'ct'
    case 'stones':
      return 'st'
    case 'ea':
      return 'ea'
    default:
      return ''
  }
}

// Schema stores "label — subLabel" in a single description column. Split it back.
function splitDescription(desc: string): { label: string; subLabel: string | null } {
  const sep = ' — '
  const idx = desc.indexOf(sep)
  if (idx === -1) return { label: desc, subLabel: null }
  return { label: desc.slice(0, idx), subLabel: desc.slice(idx + sep.length) }
}

function renderRoleToLabel(role: string | null, displayOrder: number): string {
  switch (role) {
    case 'hero':
      return 'Main'
    case 'setting_map':
      return 'Setting detail'
    case 'detail':
      return 'Detail'
    case 'render':
    default:
      return `View ${displayOrder + 1}`
  }
}

// ─── Stone-supply enum mapping ────────────────────────────────

function mapSupply(s: string): StoneSupply {
  return s === 'customer' ? 'provided_by_customer' : 'provided_by_diaco'
}

// ─── Quote build (with synthesized group headers) ────────────

interface QuoteLineRow {
  line_type: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price_cents: number | null
  line_total_cents: number
  group_label: string | null
  display_order: number
}

function buildQuote(
  rows: QuoteLineRow[] | null | undefined,
  deliveredAt: Date,
): Quote {
  const sorted = [...(rows ?? [])].sort((a, b) => a.display_order - b.display_order)

  // Pre-compute group sums for synthesized headers
  const groupSumsCents: Record<string, number> = {}
  for (const r of sorted) {
    if (r.group_label) {
      groupSumsCents[r.group_label] =
        (groupSumsCents[r.group_label] ?? 0) + r.line_total_cents
    }
  }

  const seen = new Set<string>()
  const items: QuoteLineItem[] = []

  for (const r of sorted) {
    if (r.group_label && !seen.has(r.group_label)) {
      seen.add(r.group_label)
      items.push(synthesizeGroupHeader(r.group_label, groupSumsCents[r.group_label]!))
    }
    const { label, subLabel } = splitDescription(r.description)
    items.push({
      category: mapQuoteCategory(r.line_type, r.group_label),
      label,
      subLabel,
      qty: r.quantity ?? null,
      qtyUnit: mapUnit(r.unit),
      unitPrice: r.unit_price_cents == null ? null : centsToDollars(r.unit_price_cents),
      total: centsToDollars(r.line_total_cents),
      flag: null,
      indent: r.group_label ? 1 : 0,
      isGroupHeader: false,
    })
  }

  const subtotalCents = sorted.reduce((s, r) => s + r.line_total_cents, 0)
  const subtotal = centsToDollars(subtotalCents)

  return {
    status: 'ready',
    estimatedTotal: subtotal,
    subtotal,
    lineItems: items,
    estimatedTotalNote:
      'Final billing reflects actual materials used, typically within ±5% of the estimate.',
    validity: {
      issuedAt: deliveredAt,
      validForDays: 14,
      warningAtDays: 10,
    },
    pdfUrl: null,
  }
}

function synthesizeGroupHeader(groupLabel: string, totalCents: number): QuoteLineItem {
  return {
    category: groupLabel === 'Stones' ? 'stones_group' : 'setting_group',
    label: groupLabel,
    subLabel: groupLabel === 'Stones' ? 'Provided by Dia-Co' : null,
    qty: null,
    qtyUnit: '',
    unitPrice: null,
    total: centsToDollars(totalCents),
    flag: null,
    indent: 0,
    isGroupHeader: true,
  }
}

// ─── Main fetch ───────────────────────────────────────────────

export async function fetchOrder(orderNumber: string): Promise<Order | null> {
  const supabase = await createClient()

  // One round-trip: nested PostgREST select pulls every related row.
  // FK hints (`!column`) needed where the parent table has multiple FKs to the same target.
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      customer:customers!customer_id (*),
      submitter:users!submitted_by_user_id (id, email, full_name),
      am:users!assigned_am_id (id, email, full_name),
      product_type:product_types!product_type_id (id, name, short_code),
      order_metals (
        *,
        metal:metals (*)
      ),
      order_center_stones (
        *,
        stone_type:stone_types (*),
        stone_shape:stone_shapes (*),
        setting_style:setting_styles (*)
      ),
      order_accent_stones (
        *,
        stone_type:stone_types (*),
        stone_shape:stone_shapes (*),
        setting_style:setting_styles (*)
      ),
      cad_versions (
        *,
        cad_version_renders (*),
        cad_version_metal_weights (*),
        cad_version_quote_lines (*)
      ),
      order_history_events (*),
      order_attachments (*)
    `,
    )
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error) {
    console.error('fetchOrder query error:', error.message, error.details)
    return null
  }
  if (!data) return null

  // ─── Identifiers / customer / AM ────────────────────────────

  const customerRaw = data.customer
  const submitterRaw = data.submitter
  const amRaw = data.am ?? customerRaw?.assigned_am_id ? data.am : null

  if (!customerRaw) {
    console.error(`fetchOrder: order ${orderNumber} has no customer row`)
    return null
  }

  // ─── Metals (with latest-version weight) ────────────────────

  // Find the max version_number → that's the "latest" CAD version.
  const sortedVersions = [...(data.cad_versions ?? [])].sort(
    (a, b) => a.version_number - b.version_number,
  )
  const latestVersion = sortedVersions[sortedVersions.length - 1] ?? null

  // Build a lookup: order_metal_id → latest weight_grams.
  const latestWeightByOrderMetalId = new Map<string, number>()
  if (latestVersion) {
    for (const w of latestVersion.cad_version_metal_weights ?? []) {
      latestWeightByOrderMetalId.set(w.order_metal_id, Number(w.weight_grams))
    }
  }

  const metals: MetalSpec[] = (data.order_metals ?? [])
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((om: any): MetalSpec => {
      const m = om.metal
      const karatLabel = m.karat != null ? `${m.karat}k` : (m.short_code ?? m.name)
      return {
        karatId: brand<MetalKaratId>(m.id),
        karatLabel,
        colorId: m.color ? brand<MetalColorId>(`color_${m.color}`) : null,
        colorLabel: m.color,
        finish: 'high_polish', // schema doesn't store metal finish; default
        estimatedWeightGrams: latestWeightByOrderMetalId.get(om.id) ?? null,
        actualWeightGrams: null,
      }
    })

  // ─── Center stone ───────────────────────────────────────────

  const centerRow = (data.order_center_stones ?? [])[0]
  const centerStone: CenterStoneDetail | null = centerRow
    ? {
        stoneTypeId: brand<StoneTypeId>(centerRow.stone_type.id),
        stoneTypeLabel: centerRow.stone_type.name,
        shapeId: brand<ShapeId>(centerRow.stone_shape.id),
        shapeLabel: centerRow.stone_shape.name,
        caratSize: Number(centerRow.carat_total_weight ?? centerRow.carat_each ?? 0),
        colorClarity: joinColorClarity(centerRow.quality_color, centerRow.quality_clarity),
        cert: formatCert(centerRow.certification_lab, centerRow.certification_number),
        supply: mapSupply(centerRow.supply_source),
      }
    : null

  // ─── Accent stones ──────────────────────────────────────────

  const accentStones: AccentStoneGroup[] = (data.order_accent_stones ?? [])
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((a: any): AccentStoneGroup => ({
      stoneTypeId: brand<StoneTypeId>(a.stone_type.id),
      stoneTypeLabel: a.stone_type.name,
      shapeId: brand<ShapeId>(a.stone_shape.id),
      shapeLabel: a.stone_shape.name,
      quantity: a.quantity,
      sizeMm: Number(a.size_mm ?? 0),
      cttw: Number(a.carat_total_weight ?? 0),
      supply: mapSupply(a.supply_source),
      notes: a.customer_stone_notes ?? null,
      qualityLabel: joinColorClarity(a.quality_color, a.quality_clarity),
    }))

  // ─── Engraving ──────────────────────────────────────────────

  const engraving: EngravingSpec | null = data.engraving_text || data.engraving_logo_url
    ? {
        text: data.engraving_text ?? '',
        font: data.engraving_text === '[my logo]' ? 'custom' : 'script_default',
        hasLogo: !!data.engraving_logo_url || data.engraving_text === '[my logo]',
        position: 'inside_band',
        notes: null,
      }
    : null

  // ─── CAD versions ───────────────────────────────────────────

  const amName = amRaw?.full_name ?? 'Dia-Co'
  const amInitials = initials(amName)
  const latestVersionNumber = latestVersion?.version_number ?? null

  const cadVersions: CadVersion[] = sortedVersions.map((v: any): CadVersion => {
    const deliveredAt = toDate(v.delivered_at)
    const renders: CadRender[] = [...(v.cad_version_renders ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map((r: any) => ({
        imageUrl: r.image_url,
        label: renderRoleToLabel(r.image_role, r.display_order),
        isHero: r.image_role === 'hero',
      }))

    return {
      versionNumber: `v${v.version_number}`,
      deliveredAt,
      deliveredByInternal: { name: amName, role: 'Account Manager' },
      renders,
      stlFileUrl: null,
      threeDViewerUrl: v.three_d_viewer_url ?? null,
      notesFromDesigner: v.delivery_note ?? null,
      isLatest: v.version_number === latestVersionNumber,
      quote: buildQuote(v.cad_version_quote_lines, deliveredAt),
    }
  })

  // ─── Shipping ───────────────────────────────────────────────

  const shipping: ShippingSpec = {
    type: 'drop_ship_to_customer',
    recipientName: data.ship_to_recipient_name,
    phone: null,
    address: {
      line1: data.ship_to_address_line1,
      line2: data.ship_to_address_line2 ?? undefined,
      city: data.ship_to_city,
      state: data.ship_to_state,
      zip: data.ship_to_postal_code,
      country: data.ship_to_country,
    },
    insuredAmount: centsToDollars(data.ship_to_insured_value_cents),
    carrier: null,
    trackingNumber: null,
  }

  // ─── Priority Rush ──────────────────────────────────────────

  const priorityRush: PriorityRush = {
    eligibility: mapPriorityRushEligibility(data.priority_rush_status),
    fee: data.priority_rush_fee_cents != null ? centsToDollars(data.priority_rush_fee_cents) : 50,
    requestedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    denialReason: null,
  }

  // ─── Customer attachments ───────────────────────────────────

  const customerName = customerRaw.name
  const contactName = submitterRaw?.full_name ?? null
  const contactInitials = initials(contactName ?? '')

  const customerAttachments: Attachment[] = (data.order_attachments ?? [])
    .filter((a: any) => a.source === 'customer' && !a.deleted_at)
    .sort((a: any, b: any) => +toDate(a.created_at) - +toDate(b.created_at))
    .map((a: any): Attachment => ({
      id: a.id,
      filename: a.original_filename,
      fileType: mimeToFileType(a.mime_type),
      sizeBytes: Number(a.file_size_bytes ?? 0),
      url: a.file_url,
      uploadedAt: toDate(a.created_at),
      uploadedBy: {
        name: contactName ?? 'Customer',
        role: customerName,
        avatarInitials: contactInitials || 'C',
        side: 'customer',
      },
    }))

  // ─── History events ─────────────────────────────────────────

  const versionNumberById = new Map<string, number>()
  for (const v of sortedVersions) versionNumberById.set(v.id, v.version_number)

  const history: HistoryEvent[] = (data.order_history_events ?? [])
    .filter((e: any) => e.is_customer_visible !== false)
    .sort((a: any, b: any) => +toDate(a.created_at) - +toDate(b.created_at))
    .map((e: any): HistoryEvent | null => {
      const eventType = mapHistoryEventType(e.event_type)
      if (!eventType) return null
      const side: ActorSide = e.actor_side === 'customer' ? 'customer' : 'diaco'
      const actor: Actor = {
        name: e.actor_display_name ?? (side === 'customer' ? 'Customer' : 'Dia-Co'),
        role: side === 'customer' ? customerName : 'Dia-Co · Account Manager',
        avatarInitials: initials(e.actor_display_name ?? '') || (side === 'customer' ? 'C' : 'D'),
        side,
      }
      // references: prefer payload.version_number (covers v1 events with no FK);
      // fall back to looking up via related_cad_version_id.
      const references: HistoryEventReference[] = []
      const payloadVersion = e.payload?.version_number
      if (typeof payloadVersion === 'number') {
        references.push({ kind: 'cadVersion', versionNumber: `v${payloadVersion}` })
      } else if (e.related_cad_version_id) {
        const vn = versionNumberById.get(e.related_cad_version_id)
        if (vn != null) references.push({ kind: 'cadVersion', versionNumber: `v${vn}` })
      }
      return {
        id: e.id,
        timestamp: toDate(e.created_at),
        actor,
        eventType,
        eventLabel: e.summary ?? '',
        body: typeof e.payload?.body === 'string' ? e.payload.body : '',
        attachments: [],
        references,
        isEdited: false,
        editedAt: null,
        editedBy: null,
        editReason: null,
      }
    })
    .filter((e: HistoryEvent | null): e is HistoryEvent => e !== null)

  // ─── Customer object ────────────────────────────────────────

  const customerAddress: Address = {
    line1: customerRaw.billing_address_line1,
    line2: customerRaw.billing_address_line2 ?? undefined,
    city: customerRaw.billing_city,
    state: customerRaw.billing_state,
    zip: customerRaw.billing_postal_code,
    country: customerRaw.billing_country,
  }

  const _customer: Customer = {
    id: brand<CustomerId>(customerRaw.id),
    companyName: customerName,
    contactName: contactName ?? '',
    email: submitterRaw?.email ?? '',
    phone: customerRaw.phone,
    address: customerAddress,
    assignedAmId: brand<AccountManagerId>(customerRaw.assigned_am_id ?? ''),
  }

  // ─── Stage / sub-stage ──────────────────────────────────────

  const currentStage: Stage = mapStage(data.status)
  let stageDetail: StageDetail
  if (data.status === 'designing') {
    stageDetail = {
      kind: 'designing',
      subState: mapSubStatus(data.sub_status),
      currentCadVersion: latestVersion ? `v${latestVersion.version_number}` : '',
      actionNeeded: mapActionNeeded(data.sub_status),
      actionDeadline: null,
    }
  } else if (data.status === 'cancelled') {
    stageDetail = {
      kind: 'cancelled',
      cancelledAt: toDate(data.cancelled_at) ?? new Date(),
      cancelledBy: {
        name: 'Unknown',
        role: '',
        avatarInitials: '',
        side: 'diaco',
      },
      reason: data.cancelled_reason ?? null,
    }
  } else {
    // Fallback for stages mock doesn't model granularly.
    stageDetail = { kind: 'draft' }
  }

  // ─── Build the Order ────────────────────────────────────────

  const order: Order = {
    id: brand<OrderId>(data.id),
    poNumber: data.order_number,
    styleNumber: data.style_number ?? null,
    poEndCustomerName: data.end_customer_name ?? null,
    softwareOrderId: null, // not stored in schema
    personalPo: data.client_po ?? null,
    customerId: brand<CustomerId>(customerRaw.id),
    productType: mapProductTypeName(data.product_type?.name),
    customStyle: null,
    size: parseSizeSpec(data.size_spec),
    quantity: data.quantity,
    finishPoint: data.finish_point,
    metals,
    stones: {
      hasCenterStone: centerStone !== null,
      centerStone,
      accentStones,
    },
    engraving,
    description: data.description ?? '',
    customerAttachments,
    currentStage,
    stageDetail,
    cadVersions,
    priorityRush,
    submittedAt: toDate(data.submitted_at ?? data.created_at),
    lastUpdatedAt: toDate(data.updated_at ?? data.created_at),
    expectedShipDate: null, // computed at render time, not stored
    shipping,
    history,
  }

  return order
}

// Convenience companion fetchers — the route used to call these as separate
// mock functions. Keeping the same shape so callers don't have to change.

export async function fetchCustomerForOrder(
  orderNumber: string,
): Promise<{ customer: Customer; am: AccountManager } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      customer:customers!customer_id (*),
      submitter:users!submitted_by_user_id (id, email, full_name),
      am:users!assigned_am_id (id, email, full_name)
      `,
    )
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error || !data || !data.customer) return null

  const c: any = data.customer
  const sub: any = data.submitter
  const am: any = data.am

  const customer: Customer = {
    id: brand<CustomerId>(c.id),
    companyName: c.name,
    contactName: sub?.full_name ?? '',
    email: sub?.email ?? '',
    phone: c.phone,
    address: {
      line1: c.billing_address_line1,
      line2: c.billing_address_line2 ?? undefined,
      city: c.billing_city,
      state: c.billing_state,
      zip: c.billing_postal_code,
      country: c.billing_country,
    },
    assignedAmId: brand<AccountManagerId>(c.assigned_am_id ?? ''),
  }

  const accountManager: AccountManager = am
    ? {
        id: brand<AccountManagerId>(am.id),
        name: am.full_name,
        email: am.email,
        role: 'Account Manager',
      }
    : {
        id: brand<AccountManagerId>(''),
        name: 'Dia-Co',
        email: '',
        role: 'Account Manager',
      }

  return { customer, am: accountManager }
}
