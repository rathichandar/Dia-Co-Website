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

export type SizeUnit = "US" | "EU" | "mm"

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
  quote: Quote
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

  finishPoint: FinishPoint

  metals: MetalSpec[]
  stones: StoneSpec
  engraving: EngravingSpec | null

  description: string
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
