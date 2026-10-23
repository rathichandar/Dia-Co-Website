// ============================================================
// Diaco Portal — Order types
// The canonical data shape for an order in our system.
// ============================================================

// ─── Branded ID types ──────────────────────────────────────

export type OrderId = string & { readonly __brand: "OrderId" }
export type CustomerId = string & { readonly __brand: "CustomerId" }
export type AccountManagerId = string & { readonly __brand: "AccountManagerId" }
export type StoneTypeId = string & { readonly __brand: "StoneTypeId" }
export type ShapeId = string & { readonly __brand: "ShapeId" }
export type MetalKaratId = string & { readonly __brand: "MetalKaratId" }
export type MetalColorId = string & { readonly __brand: "MetalColorId" }

// ─── Static enums ──────────────────────────────────────────

export type ProductType =
  | "ring"
  | "pendant"
  | "earrings"
  | "bracelet"
  | "necklace"
  | "grillz"
  | "finished_product"
  | "other"

export type FinishPoint =
  | "file"
  | "wax"
  | "raw_casting"
  | "polished_mounting"
  | "finished_piece"

export type Stage =
  | "draft"
  | "designing"
  | "production"
  | "qc"
  | "shipping"
  | "completed"
  | "cancelled"

export type MetalFinish =
  | "high_polish"
  | "matte"
  | "brushed"
  | "hammered"
  | "satin"
  | "other"

export type StoneSupply =
  | "provided_by_customer"
  | "provided_by_diaco"
  | "tbd"
  | "not_in_design"

export type QuoteStatus =
  | "pending"
  | "ready"
  | "validity_warning"
  | "expired"
  | "outdated"

export type QuoteLineCategory =
  | "cad"
  | "wax"
  | "metal"
  | "stones_group"
  | "stones_subitem"
  | "setting_group"
  | "setting_subitem"
  | "finishing"
  | "engraving"
  | "shipping"
  | "other"

export type QtyUnit = "g" | "ea" | "ct" | "st" | ""

export type LineItemFlag = "free" | "included" | null

export type FontFamily = "script_default" | "block" | "italic" | "custom"

export type EngravingPosition = "inside_band" | "outside" | "other"

export type ShippingType = "drop_ship_to_customer" | "back_to_jeweler"

export type Carrier = "fedex" | "ups" | "usps" | "courier" | "other"

// "in": a bracelet or necklace length, as the ERP keeps it (an ERP order)
export type SizeUnit = "US" | "EU" | "mm" | "in"

export type ActorSide = "customer" | "diaco"

export type HistoryEventType =
  | "order_submitted"
  | "cad_delivered"
  | "modification_requested"
  | "approved"
  | "cancelled"
  | "stage_changed"
  | "ship_date_changed"
  | "message"
  | "file_uploaded"
  | "priority_rush_requested"
  | "priority_rush_approved"
  | "priority_rush_denied"

export type FileType = "image" | "cad_file" | "pdf" | "other"

export type DesigningSubState =
  | "awaiting_first_cad"
  | "awaiting_customer_review"
  | "awaiting_modifications"
  | "approved"

export type DesigningActionNeeded =
  | "approve_cad"
  | "review_modifications"
  | null

export type ProductionSubStageName =
  | "printing"
  | "casting"
  | "cleaning"
  | "setting"
  | "polishing"
  | "finishing"

export type ProductionSubStageStatus =
  | "pending"
  | "in_progress"
  | "complete"

export type PriorityRushEligibility =
  | "not_requested"
  | "requested_pending_review"
  | "approved"
  | "denied"

// ─── Sub-shapes ────────────────────────────────────────────

export interface Actor {
  name: string
  role: string
  avatarInitials: string
  side: ActorSide
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface Customer {
  id: CustomerId
  companyName: string
  contactName: string
  email: string
  phone: string
  address: Address
  assignedAmId: AccountManagerId
}

export interface AccountManager {
  id: AccountManagerId
  name: string
  email: string
  role: string
}

export interface MetalSpec {
  karatId: MetalKaratId
  karatLabel: string
  colorId: MetalColorId | null
  colorLabel: string | null
  finish: MetalFinish
  estimatedWeightGrams: number | null
  actualWeightGrams: number | null
}

export interface CenterStoneDetail {
  stoneTypeId: StoneTypeId
  stoneTypeLabel: string
  shapeId: ShapeId
  shapeLabel: string
  caratSize: number
  colorClarity: string | null
  cert: string | null
  supply: StoneSupply
}

export interface AccentStoneGroup {
  stoneTypeId: StoneTypeId
  stoneTypeLabel: string
  shapeId: ShapeId
  shapeLabel: string
  quantity: number
  sizeMm: number
  cttw: number
  supply: StoneSupply
  notes: string | null
  qualityLabel: string | null
}

export interface StoneSpec {
  hasCenterStone: boolean
  centerStone: CenterStoneDetail | null
  accentStones: AccentStoneGroup[]
}

export interface EngravingSpec {
  text: string
  font: FontFamily
  hasLogo: boolean
  position: EngravingPosition
  notes: string | null
}

export interface Attachment {
  id: string
  filename: string
  fileType: FileType
  sizeBytes: number
  url: string
  uploadedAt: Date
  uploadedBy: Actor
}

export interface CadRender {
  imageUrl: string
  label: string
  isHero: boolean
}

// ─── Quote ──────────────────────────────────────────────────

export interface QuoteLineItem {
  category: QuoteLineCategory
  label: string
  subLabel: string | null
  qty: number | null
  qtyUnit: QtyUnit
  unitPrice: number | null
  total: number
  flag: LineItemFlag
  indent: 0 | 1
  isGroupHeader: boolean
}

export interface QuoteValidity {
  issuedAt: Date
  validForDays: number
  warningAtDays: number
}

export interface Quote {
  status: QuoteStatus
  estimatedTotal: number
  lineItems: QuoteLineItem[]
  subtotal: number
  estimatedTotalNote: string
  validity: QuoteValidity
  pdfUrl: string | null
}

// ─── ERP quote (ERP integration Step 4a) ───────────────────
// A version read from the ERP carries its quote as the ERP's printed quote reads, cell for cell: the
// text is the ERP's own (pc, wt, rate, qty) and is displayed, never recomputed. Amounts are dollars.

export interface ErpQuoteLine {
  dept: string
  process: string
  pc: string
  wt: string
  rate: string
  qty: string
  amount: number
  rjo: boolean
  added: boolean
}

export interface ErpQuote {
  lines: ErpQuoteLine[]
  total: number
  caution: boolean
  cautionNote: string | null
  disclaimer: string | null
}

// ─── CadVersion — now carries its own quote snapshot ──────

export interface CadVersion {
  versionNumber: string
  deliveredAt: Date
  deliveredByInternal: { name: string; role: string }
  renders: CadRender[]
  stlFileUrl: string | null
  threeDViewerUrl: string | null
  notesFromDesigner: string | null
  isLatest: boolean
  // The Portal's own quote (Phase 1 tables). null for a version read from the ERP, which carries erpQuote.
  quote: Quote | null
  // ERP integration Step 4a: the quote the ERP sent with this version, or null when it sent none.
  erpQuote?: ErpQuote | null
  // ERP integration Step 4b: the ERP's own stamp for this showing. An approval names it, and the ERP refuses
  // the approval when a newer showing has been sent since.
  erpReviewAt?: string | null
  // When Dia-Co re-sent this version with an updated quote (the ERP sent the same version again at Client Review);
  // null when the quote is the one the version first came with.
  erpQuoteUpdatedAt?: Date | null
}

// ERP integration Step 4b: a request the customer made on an ERP order, as the ERP keeps it. It changes
// nothing on the order: an AM acts on it, then marks it done or declined, with a note the customer reads.
// "question" (2026-10-23): a question about a change Dia-Co made; Dia-Co answers it by marking it done with a note.
export type ErpRequestKind = "approve" | "modify" | "cancel" | "rush" | "question"

export interface ErpRequest {
  id: string
  kind: ErpRequestKind
  text: string
  // approve and modify: the version on screen. approve: the quote total it was shown with (null: none).
  againstV: string | null
  quoteTotal: number | null
  askedBy: string
  status: "pending" | "done" | "declined"
  createdAt: Date
  decidedAt: Date | null
  note: string | null
}

// ERP integration (2026-10-23): a detail of what the customer sent that Dia-Co changed -- while creating the order
// from the Portal's, or later. The ERP sends it already in the Portal's words; it never says who at Dia-Co changed it.
export type ErpChangeField =
  | "reference"
  | "end_customer"
  | "quantity"
  | "product_type"
  | "size"
  | "finish_point"
  | "metal"
  | "center_stone"
  | "more_centers"
  | "accents"
  | "engraving"
  | "description"
  | "shipping"

export interface ErpChange {
  // null: a field this Portal does not know (the change still shows, under its label)
  field: ErpChangeField | null
  what: string
  // null = nothing (the customer left it empty / Dia-Co removed it)
  was: string | null
  now: string | null
  // Dia-Co's note to the customer about this change
  note: string | null
  // ISO timestamp, as the ERP sent it
  at: string
  // true: changed while the order was being created from what the customer sent
  atCreation: boolean
}

// The order's current specification in words, as the ERP sends it (absent from an older ERP).
export interface ErpOrderDetails {
  metals: string[]
  centerStone: string | null
  moreCenters: string[]
  accents: string | null
  engraving: string | null
}

// Where an ERP order ships when the customer named somewhere other than their own address (the ERP's data.shipTo, owner
// ruling D5), as the ERP holds it now -- an AM's correction included.
export interface ErpShipTo {
  method: "drop_ship" | "different_address" | "standard" | null
  recipient: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postal: string | null
  country: string | null
  phone: string | null
}

// ─── Shipping ───────────────────────────────────────────────

export interface ShippingSpec {
  type: ShippingType
  recipientName: string | null
  phone: string | null
  address: Address | null
  insuredAmount: number
  carrier: Carrier | null
  trackingNumber: string | null
}

export interface PriorityRush {
  eligibility: PriorityRushEligibility
  fee: number
  requestedAt: Date | null
  reviewedAt: Date | null
  reviewedBy: { name: string; role: string } | null
  denialReason: string | null
}

// ─── History ────────────────────────────────────────────────

export interface HistoryEventReference {
  kind: "cadVersion"
  versionNumber: string
}

export interface HistoryEvent {
  id: string
  timestamp: Date
  actor: Actor
  eventType: HistoryEventType
  eventLabel: string
  body: string
  attachments: Attachment[]
  references: HistoryEventReference[]
  isEdited: boolean
  editedAt: Date | null
  editedBy: { name: string; role: string } | null
  editReason: string | null
}

// ─── StageDetail discriminated union ────────────────────────

export interface DesigningStageDetail {
  kind: "designing"
  subState: DesigningSubState
  currentCadVersion: string
  actionNeeded: DesigningActionNeeded
  actionDeadline: Date | null
}

export interface ProductionStageDetail {
  kind: "production"
  subStages: {
    name: ProductionSubStageName
    status: ProductionSubStageStatus
  }[]
}

export interface QcStageDetail {
  kind: "qc"
  inspectionPassed: boolean | null
  videoUrl: string | null
}

export interface ShippingStageDetail {
  kind: "shipping"
  shippedAt: Date | null
  trackingNumber: string | null
  estimatedDelivery: Date | null
}

export interface DraftStageDetail {
  kind: "draft"
}

export interface CompletedStageDetail {
  kind: "completed"
  completedAt: Date
}

export interface CancelledStageDetail {
  kind: "cancelled"
  cancelledAt: Date
  cancelledBy: Actor
  reason: string | null
}

export type StageDetail =
  | DraftStageDetail
  | DesigningStageDetail
  | ProductionStageDetail
  | QcStageDetail
  | ShippingStageDetail
  | CompletedStageDetail
  | CancelledStageDetail

// ─── The Order ─────────────────────────────────────────────
//
// 4 identifiers:
//   poNumber:          Dia-Co order #     ("DG-10001") — unique forever
//   styleNumber:       Dia-Co style #     ("200001-R") — reusable design ID
//   personalPo:        Client's own PO    ("HFJ-Bennett-1018") — their reference
//   poEndCustomerName: end-customer name  ("Lauren") — human label
//
// Quote: per-CAD-version. order.quote no longer exists.
// Use the active CadVersion's `quote` field instead.

export interface Order {
  id: OrderId
  poNumber: string
  styleNumber: string | null
  poEndCustomerName: string | null
  softwareOrderId: string | null
  personalPo: string | null

  customerId: CustomerId

  productType: ProductType
  customStyle: string | null
  size: { value: number; unit: SizeUnit } | null
  quantity: number

  // null: an ERP order whose finish point Dia-Co has not set (an imported order) -- shown as "—", never guessed
  finishPoint: FinishPoint | null

  metals: MetalSpec[]
  stones: StoneSpec
  engraving: EngravingSpec | null

  description: string
  // An ERP order: the customer's notes for Dia-Co, sent with the description (their own words, shown back to them)
  customerNotes?: string | null
  customerAttachments: Attachment[]

  currentStage: Stage
  stageDetail: StageDetail

  cadVersions: CadVersion[]

  priorityRush: PriorityRush

  submittedAt: Date
  lastUpdatedAt: Date
  expectedShipDate: { start: Date; end: Date } | null

  shipping: ShippingSpec

  history: HistoryEvent[]

  // ERP integration Step 2: an order read from the ERP (src/lib/erp/erpOrders.ts) rather than the
  // Portal's own tables, and its status in the Portal's words as the ERP translated it (so the header
  // pill can show e.g. "On hold", which `currentStage` alone cannot carry).
  source?: "portal" | "erp"
  portalStatus?: string
  // ERP integration Step 4a: the ERP could not turn its render paths into links just now.
  erpRendersUnavailable?: boolean
  // ERP integration Step 4b: the customer's requests on this ERP order, newest first. Undefined when the ERP
  // did not answer the list (an older gateway, or a failed call): the page then offers no requests at all.
  erpRequests?: ErpRequest[]
  // 2026-10-23: what Dia-Co changed of what the customer sent, oldest first ([] when nothing, or an older ERP), and
  // the order's specification in words (undefined from an older ERP: the page then shows what it showed before).
  erpChanges?: ErpChange[]
  erpDetails?: ErpOrderDetails
  // 2026-10-23 (the field audit): where it ships when that is not the customer's own address; undefined from an older
  // ERP, null when it ships to their address.
  erpShipTo?: ErpShipTo | null
}

// ─── Helper: a size as the page prints it ──────────────────

// "6.5 (US)" for a ring size, "7.5 in" for a bracelet or necklace length.
export function sizeLabel(size: Order["size"]): string {
  if (!size) return "—"
  return size.unit === "in" ? `${size.value} in` : `${size.value} (${size.unit})`
}

// ─── Helper: get a specific CAD version's quote ───────────

export function getQuoteForVersion(
  order: Order,
  versionNumber: string
): Quote | null {
  const version = order.cadVersions.find(
    (v) => v.versionNumber === versionNumber
  )
  return version?.quote ?? null
}

export function getLatestCadVersion(order: Order): CadVersion | null {
  return order.cadVersions.find((v) => v.isLatest) ?? null
}
