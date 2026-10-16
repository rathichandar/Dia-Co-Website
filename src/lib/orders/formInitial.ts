// ============================================================
// formInitial — Shared form state types + defaults.
//
// FormFields, INITIAL_FIELDS, MetalRow, and the EMPTY_* row
// constants moved here from NewOrderForm.tsx during Step 7 so the
// resume hydration path (fetchDraftForResume.ts) can construct
// initial state without crossing the client-component boundary.
// NewOrderForm imports from this module.
//
// CenterStoneRow + AccentStoneRow + the per-row helpers are in
// submitValidation.ts (extracted during Step 6 for the same
// shared-source-of-truth reason).
// ============================================================

import type {
  HasStones,
  EngravingPosition,
  MetalFinish,
  ShippingMethod,
} from "./saveDraft"
import type {
  CenterStoneRow,
  AccentStoneRow,
  FinishPoint,
} from "./submitValidation"

export interface MetalRow {
  metal_id: string | null
  area: string
  finish: MetalFinish | null
}

export const EMPTY_METAL_ROW: MetalRow = {
  metal_id: null,
  area: "",
  finish: null,
}

export const EMPTY_CENTER_STONE_ROW: CenterStoneRow = {
  topType: null,
  stoneTypeId: null,
  shapeId: null,
  supplySource: null,
  caratMin: "",
  caratMax: "",
  colorMin: null,
  colorMax: null,
  clarityMin: null,
  clarityMax: null,
  makeMin: null,
  makeMax: null,
  certification: null,
  lengthMm: "",
  widthMm: "",
  depthMm: "",
  customStoneTypeName: "",
}

export const EMPTY_ACCENT_STONE_ROW: AccentStoneRow = {
  topType: null,
  subType: null,
  supplySource: null,
  qualityColor: null,
  qualityClarity: null,
}

export interface FormFields {
  clientPo: string
  endCustomerName: string
  productTypeShortCode: string | null
  quantity: number
  sizeSpec: string
  finishPoint: FinishPoint | null
  description: string
  submissionNotes: string
  engravingText: string
  engravingUseLogo: boolean
  engravingLogoPosition: EngravingPosition | null
  engravingTextPosition: EngravingPosition | null
  shippingMethod: ShippingMethod | null
  shipToRecipientName: string
  shipToAddressLine1: string
  shipToAddressLine2: string
  shipToCity: string
  shipToState: string
  shipToPostalCode: string
  shipToCountry: string
  shipToPhone: string
  metals: MetalRow[]
  hasCenterStones: HasStones | null
  centerStones: CenterStoneRow[]
  hasAccentStones: HasStones | null
  accentStones: AccentStoneRow[]
}

export const INITIAL_FIELDS: FormFields = {
  clientPo: "",
  endCustomerName: "",
  productTypeShortCode: null,
  quantity: 1,
  sizeSpec: "",
  finishPoint: null,
  description: "",
  submissionNotes: "",
  engravingText: "",
  engravingUseLogo: false,
  engravingLogoPosition: null,
  engravingTextPosition: null,
  shippingMethod: null,
  shipToRecipientName: "",
  shipToAddressLine1: "",
  shipToAddressLine2: "",
  shipToCity: "",
  shipToState: "",
  shipToPostalCode: "",
  shipToCountry: "US",
  shipToPhone: "",
  metals: [{ ...EMPTY_METAL_ROW }],
  hasCenterStones: null,
  centerStones: [],
  hasAccentStones: null,
  accentStones: [],
}
