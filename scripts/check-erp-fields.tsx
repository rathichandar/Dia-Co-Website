/**
 * ERP integration, 2026-10-23 (the field audit) -- checks what an ERP order's page shows of the fields it used to miss:
 * Priority Rush in the header, the customer's description and notes, the ship-to, a bracelet's length in inches, every
 * metal on the Metal tile, and no finish point guessed when the ERP has none. The components are drawn with fixtures
 * (react-dom/server); nothing calls the ERP. The ERP side is proven in its repo (portal.test.js P,
 * db/2026-10-23-portal-order-fields.sql's PROOF NOTE).
 *
 * Usage: npm run check:erp-fields
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { sizeLabel, type Customer, type Order } from '../src/types/order'
import { KeySpecs } from '../src/components/orders/KeySpecs'
import { FullSpecificationsGrid } from '../src/components/orders/FullSpecifications'
import { YourDescription } from '../src/components/orders/YourDescription'
import { ErpShipTo, ErpShipToGrid } from '../src/components/orders/ErpShipTo'
import { OrderHeader } from '../src/components/orders/OrderHeader'

const results: Array<[string, boolean]> = []
const check = (name: string, ok: boolean) => results.push([name, ok])

const base: Order = {
  id: 'AB-1321' as Order['id'], poNumber: 'AB-1321', styleNumber: 'B-2260', poEndCustomerName: 'Lou Beck', softwareOrderId: 'AB-1321',
  personalPo: 'PO-88214', customerId: '' as Order['customerId'], productType: 'bracelet', customStyle: null, size: { value: 7.5, unit: 'in' },
  quantity: 1, finishPoint: 'finished_piece',
  metals: [
    { karatId: '18K' as Order['metals'][0]['karatId'], karatLabel: '18K', colorId: null, colorLabel: 'White', finish: 'other', estimatedWeightGrams: null, actualWeightGrams: null },
    { karatId: '14K' as Order['metals'][0]['karatId'], karatLabel: '14K', colorId: null, colorLabel: 'Yellow', finish: 'other', estimatedWeightGrams: null, actualWeightGrams: null },
  ],
  stones: { hasCenterStone: false, centerStone: null, accentStones: [] }, engraving: null,
  description: 'A tennis bracelet,\nthin links', customerNotes: 'Call before casting', customerAttachments: [],
  currentStage: 'production', stageDetail: { kind: 'production', subStages: [] },
  cadVersions: [], priorityRush: { eligibility: 'approved', fee: 0, requestedAt: null, reviewedAt: null, reviewedBy: null, denialReason: null },
  submittedAt: new Date(2026, 9, 23, 12), lastUpdatedAt: new Date(2026, 9, 24, 12), expectedShipDate: null,
  shipping: { type: 'back_to_jeweler', recipientName: null, phone: null, address: null, insuredAmount: 0, carrier: null, trackingNumber: null },
  history: [], source: 'erp', portalStatus: 'approved',
  erpChanges: [{ field: 'shipping', what: 'Shipping', was: 'Lou Beck · 1 Main St, Austin', now: 'Lou Beck · 9 Elm St, Dallas', note: null,
    at: '2026-10-24T18:00:00Z', atCreation: false }],
  erpDetails: { metals: ['18K White · links · High polish', '14K Yellow · clasp'], centerStone: null, moreCenters: [], accents: 'Supplied by you', engraving: null },
  erpShipTo: { method: 'drop_ship', recipient: 'Lou Beck', line1: '9 Elm St', line2: null, city: 'Dallas', state: 'TX', postal: '75201', country: 'US', phone: '(214) 555-0100' },
}
const customer: Customer = {
  id: '' as Customer['id'], companyName: 'ACME JEWELRY', contactName: 'Jane Buyer', email: '', phone: '',
  address: { line1: '', city: '', state: '', zip: '', country: '' }, assignedAmId: '' as Customer['assignedAmId'],
}

// ─── Sizes, the finish point, the metals ───────────────────
check('size: a bracelet in inches, a ring as a US size, none as a dash',
  sizeLabel({ value: 7.5, unit: 'in' }) === '7.5 in' && sizeLabel({ value: 6.5, unit: 'US' }) === '6.5 (US)' && sizeLabel(null) === '—')
const tiles = renderToStaticMarkup(<KeySpecs order={base} amName="Dia-Co" />)
check('tiles: the length in inches, every metal on the Metal tile', tiles.includes('>7.5 in<') && tiles.includes('18K White + 14K Yellow'))
const noFinish = renderToStaticMarkup(<KeySpecs order={{ ...base, finishPoint: null }} amName="Dia-Co" />)
check('tiles: no finish point is a dash, never "Finished piece"', !noFinish.includes('Finished piece') && /Finish<\/div><div class="key-spec__v">—</.test(noFinish))
const portalTiles = renderToStaticMarkup(<KeySpecs order={{ ...base, source: 'portal' }} amName="Anu" />)
check('tiles: a Portal order keeps its first metal on the tile', portalTiles.includes('>18K White<') && !portalTiles.includes('+ 14K Yellow'))
const spec = renderToStaticMarkup(<FullSpecificationsGrid order={{ ...base, finishPoint: null }} />)
check('spec: no finish point is a dash; the length in inches', /Finish point<\/div><div class="v">—</.test(spec) && spec.includes('>7.5 in<'))

// ─── The customer's own words ──────────────────────────────
const desc = renderToStaticMarkup(<YourDescription order={base} customer={customer} />)
check('description: theirs, line breaks kept, then their notes, signed by who sent it',
  desc.includes('Your description') && desc.includes('desc-block__text">A tennis bracelet,\nthin links<') && desc.includes('Your notes for Dia-Co')
  && desc.includes('Call before casting') && desc.includes('Submitted by Jane Buyer on October 23, 2026'))
const notesOnly = renderToStaticMarkup(<YourDescription order={{ ...base, description: '' }} customer={{ ...customer, contactName: '' }} />)
check('description: notes alone still show; no name, no "by"', notesOnly.includes('Your notes for Dia-Co') && !notesOnly.includes('Your description')
  && notesOnly.includes('Submitted on October 23, 2026') && !notesOnly.includes('Submitted by'))
check('description: nothing written, nothing shown', renderToStaticMarkup(<YourDescription order={{ ...base, description: '', customerNotes: null }} customer={customer} />) === '')
const changedDesc = renderToStaticMarkup(<YourDescription order={{ ...base, erpChanges: [{ field: 'description', what: 'Your description', was: 'old', now: 'new', note: null, at: '2026-10-24T18:00:00Z', atCreation: false }] }} customer={customer} />)
check('description: a description Dia-Co changed is marked', changedDesc.includes('Changed Oct 24'))
const portalDesc = renderToStaticMarkup(<YourDescription order={{ ...base, source: 'portal', customerNotes: undefined, erpChanges: undefined }} customer={customer} />)
check('description: a Portal order shows as before', portalDesc.includes('Your description') && !portalDesc.includes('Your notes') && portalDesc.includes('Submitted by Jane Buyer'))

// ─── The ship-to ───────────────────────────────────────────
const ship = renderToStaticMarkup(<ErpShipToGrid order={base} />)
check('ship-to: the section is titled "Drop ship" and names the recipient', /Drop ship/.test(renderToStaticMarkup(<ErpShipTo order={base} />))
  && renderToStaticMarkup(<ErpShipTo order={base} />).includes('Lou Beck'))
check('ship-to: drop ship, recipient, address, phone', ship.includes('Drop-ship to your client') && ship.includes('Lou Beck')
  && ship.includes('9 Elm St') && ship.includes('Dallas, TX 75201') && ship.includes('(214) 555-0100'))
check('ship-to: a ship-to Dia-Co changed says when and what was sent', ship.includes('Changed Oct 24') && ship.includes('You sent <s>Lou Beck · 1 Main St, Austin</s>'))
check('ship-to: none (their own address, or an older ERP) shows nothing',
  renderToStaticMarkup(<ErpShipTo order={{ ...base, erpShipTo: null }} />) === '' && renderToStaticMarkup(<ErpShipTo order={{ ...base, erpShipTo: undefined }} />) === '')
check('ship-to: no insurance, carrier or account block', !ship.includes('Insured') && !ship.includes('Your account'))

// ─── Priority Rush ─────────────────────────────────────────
const head = renderToStaticMarkup(<OrderHeader order={base} amName="Dia-Co" />)
check('header: an ERP order on Priority Rush carries the badge', head.includes('badge--rush') && head.includes('Priority Rush'))
const headNo = renderToStaticMarkup(<OrderHeader order={{ ...base, priorityRush: { ...base.priorityRush, eligibility: 'not_requested' } }} amName="Dia-Co" />)
check('header: not on Rush, no badge', !headNo.includes('badge--rush'))
const headPortal = renderToStaticMarkup(<OrderHeader order={{ ...base, source: 'portal' }} amName="Anu" />)
check('header: a Portal order\'s own rush is its rail\'s, not this badge', !headPortal.includes('badge--rush'))

let failed = 0
for (const [name, ok] of results) {
  if (!ok) failed++
  console.log((ok ? '  ok    ' : '  FAIL  ') + name)
}
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
