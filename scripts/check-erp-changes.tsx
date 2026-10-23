/**
 * ERP integration, 2026-10-23 -- checks what the customer sees of the details Dia-Co changed of what they sent:
 * reading the ERP's `changes` / `details`, the "New" rule, the card's groups and notes, the header strip, the orders
 * list chip, a question about a change in "Your requests", and the marked key-spec tiles and spec rows. The
 * components are drawn with fixtures (react-dom/server); nothing calls the ERP.
 *
 * Usage: npm run check:erp-changes
 */
import { renderToStaticMarkup } from 'react-dom/server'
import type { ErpRequest, Order } from '../src/types/order'
import {
  changesChipText,
  changesStripText,
  countNew,
  fieldChange,
  groupChanges,
  isNewChange,
  latestChangeAt,
  metalLines,
  moreCentersText,
  readErpChanges,
  readErpDetails,
  tileParts,
} from '../src/lib/orders/erpChanges'
import { ErpChangesCardView } from '../src/components/orders/ErpChangesCard'
import { ErpChangesStrip } from '../src/components/orders/ErpChangesStrip'
import { ErpChangesChipView } from '../src/components/orders/ErpChangesChip'
import { ErpYourRequests } from '../src/components/orders/ErpYourRequests'
import { KeySpecs } from '../src/components/orders/KeySpecs'
import { FullSpecificationsGrid } from '../src/components/orders/FullSpecifications'

const results: Array<[string, boolean]> = []
const check = (name: string, ok: boolean) => results.push([name, ok])
const count = (html: string, s: string) => html.split(s).length - 1

// ─── Fixtures: the mockup's AB-1320 (times in UTC; Oct 23 and Oct 24 are Pacific days) ───

const RAW = [
  // sent out of order on purpose: the reader sorts oldest first
  { field: 'center_stone', what: 'Center stone', was: 'Lab-grown · Oval · 2 – 2.2 ct · E – F · VS1 – VVS2 · IGI',
    now: 'Lab-grown · Oval · 2.0 – 2.1 ct · E – F · VS1 – VVS2 · IGI',
    note: 'We can’t get a 2.2 ct stone in E – F this month.', at: '2026-10-24T18:00:00Z', at_creation: false },
  { field: 'size', what: 'Size', was: '6.5', now: '6.75', note: 'As agreed with you on the phone on Oct 23.',
    at: '2026-10-23T17:00:00Z', at_creation: true },
  { field: 'metal', what: 'Metal', was: '18K Rose · band · Satin', now: '18K Rose · band · High polish', note: null,
    at: '2026-10-23T17:00:00Z', at_creation: true },
  { field: 'size', what: '', was: '1', now: '2', at: 'not a time', at_creation: false }, // no time: left out
  { field: 'mystery', what: '', was: 'a', now: 'b', at: '2026-10-24T19:00:00Z' }, // no label: left out
  { field: 'engraving', was: null, now: '“Forever” · Inside shank — Top', at: '2026-10-25T16:00:00Z' }, // label from the field
]
const changes = readErpChanges(RAW)
const details = readErpDetails({
  metals: ['18K Rose · band · High polish', 'Platinum · prongs · High polish'],
  center_stone: 'Lab-grown · Oval · 2.0 – 2.1 ct · E – F · VS1 – VVS2 · IGI',
  more_centers: ['Ruby · Pear · 0.5 ct'],
  accents: 'Natural diamond · HI · SI1 · you supply',
  engraving: '  “Forever” · Inside shank — Top  ',
})
const designs = [{ label: 'v1', at: new Date('2026-10-24T20:00:00Z') }]

// ─── Reading the ERP ───────────────────────────────────────

check('readErpChanges: an older ERP (no changes) is none', readErpChanges(undefined).length === 0 && readErpChanges(null).length === 0)
check('readErpChanges: rows with no time or no label are left out', changes.length === 4)
check('readErpChanges: oldest first, keeping the ERP order for changes made together',
  changes.map((c) => c.what).join('|') === 'Size|Metal|Center stone|Engraving')
check('readErpChanges: a label from the field when the ERP sent none', changes[3].what === 'Engraving' && changes[3].field === 'engraving')
check('readErpChanges: at_creation is true only when sent true', changes[0].atCreation && !changes[2].atCreation && !changes[3].atCreation)
check('readErpChanges: null was / note stay null', changes[3].was === null && changes[3].note === null && changes[1].note === null)
check('readErpDetails: an older ERP (no details) is undefined', readErpDetails(undefined) === undefined && readErpDetails([]) === undefined)
check('readErpDetails: words trimmed, lists kept', !!details && details.engraving === '“Forever” · Inside shank — Top' && details.moreCenters.length === 1)

// ─── The strip, the chip, New ──────────────────────────────

const strip = changesStripText(changes)
check('strip text: distinct labels in order', strip.lead === 'Dia-Co changed 4 details'
  && strip.rest === ' of what you sent: Size, Metal, Center stone and Engraving.')
check('strip text: one detail', changesStripText(changes.slice(0, 1)).lead === 'Dia-Co changed 1 detail'
  && changesStripText(changes.slice(0, 1)).rest === ' of what you sent: Size.')
check('strip text: a field changed twice counts once', changesStripText([changes[0], { ...changes[0], at: '2026-10-26T00:00:00Z' }]).lead === 'Dia-Co changed 1 detail')
check('chip text', changesChipText(3, 1) === '3 changes by Dia-Co · 1 new' && changesChipText(1, 0) === '1 change by Dia-Co')
const seen = '2026-10-23T17:00:00Z' // the page was last shown when the order was created
check('New: nothing is new before the browser has read its mark', !isNewChange(changes[2].at, undefined))
check('New: everything is new when this browser never showed the changes', countNew(changes.map((c) => c.at), null) === 4)
check('New: only what came after the mark', countNew(changes.map((c) => c.at), seen) === 2 && !isNewChange(changes[0].at, seen))
check('New: a mark written another way (+00:00) still compares as a time', countNew(changes.map((c) => c.at), '2026-10-23T17:00:00+00:00') === 2)
check('the mark recorded is the latest change', latestChangeAt(changes) === '2026-10-25T16:00:00Z')

// ─── The card's groups ─────────────────────────────────────

const groups = groupChanges(changes, designs)
check('groups: newest first, the creation group last', groups.map((g) => g.heading).join('|')
  === 'Oct 25|Oct 24 · with design v1|Oct 23 · when your order was created')
check('groups: changes made together stay together, in the order sent', groups[2]?.changes.map((c) => c.what).join('|') === 'Size|Metal')
check('groups: no design that day, just the day', groupChanges(changes, []).map((g) => g.heading)[1] === 'Oct 24')
check('groups: a Pacific evening is still that day', groupChanges([{ ...changes[2], at: '2026-10-25T05:30:00Z' }], [])[0].heading === 'Oct 24')

// ─── One field ─────────────────────────────────────────────

const twice = readErpChanges([
  { field: 'size', was: '6.5', now: '6.75', at: '2026-10-23T17:00:00Z', at_creation: true },
  { field: 'size', was: '6.75', now: '7', at: '2026-10-24T17:00:00Z' },
])
const sz = fieldChange(twice, 'size')
check('fieldChange: what the customer first sent, the latest change\'s day', !!sz && sz.was === '6.5' && sz.at === '2026-10-24T17:00:00Z')
check('fieldChange: an unchanged field is null', fieldChange(twice, 'quantity') === null)
const ml = metalLines(details!.metals, changes)
check('metalLines: the changed metal carries what was sent, the other none',
  ml.lines[0].change?.was === '18K Rose · band · Satin' && ml.lines[1].change === null && ml.loose.length === 0)
const chained = metalLines(['14K White'], readErpChanges([
  { field: 'metal', was: '14K Yellow', now: '18K Yellow', at: '2026-10-23T17:00:00Z' },
  { field: 'metal', was: '18K Yellow', now: '14K White', at: '2026-10-24T17:00:00Z' },
  { field: 'metal', was: 'Platinum', now: null, at: '2026-10-24T17:00:00Z' },
]))
check('metalLines: followed back to what was sent; a removed metal is loose',
  chained.lines[0].change?.was === '14K Yellow' && chained.loose.length === 1 && chained.loose[0].was === 'Platinum')
check('moreCentersText', moreCentersText(['Ruby · Pear · 0.5 ct']) === '2nd: Ruby · Pear · 0.5 ct'
  && moreCentersText(['A', 'A']) === '2nd and 3rd: A each' && moreCentersText(['A', 'B']) === '2nd and 3rd: A; B' && moreCentersText([]) === null)
check('tileParts', tileParts(details!.centerStone).v === 'Lab-grown · Oval' && tileParts(null).v === '—')

// ─── The card, drawn ───────────────────────────────────────

const card = renderToStaticMarkup(
  <ErpChangesCardView changes={changes} designs={designs} seenBefore={seen} ask={{ kind: 'ask', onAsk: () => {} }} />,
)
check('card: the anchor the strip links to', card.includes('id="changes"'))
check('card: eyebrow, title, intro', card.includes('Changed by Dia-Co · 4') && card.includes('Your order differs from what you sent')
  && card.includes('Your account manager changed these details. Everything else is as you sent it.'))
check('card: group headings, newest first', card.indexOf('Oct 25') < card.indexOf('Oct 24 · with design v1')
  && card.indexOf('Oct 24 · with design v1') < card.indexOf('Oct 23 · when your order was created'))
check('card: New only on changes made after the mark', count(card, '>New<') === 2)
check('card: what was sent struck, what it is now bold', card.includes('<s>6.5</s>') && card.includes('<strong>6.75</strong>'))
check('card: nothing sent reads Nothing', card.includes('<span>Nothing</span>'))
check('card: Dia-Co\'s notes, only where there is one', count(card, 'erp-chg__note') === 2 && card.includes('<b>Dia-Co:</b> As agreed with you on the phone on Oct 23.'))
check('card: never says who at Dia-Co', !/chandar|Anu|by [A-Z][a-z]+ at Dia-Co/.test(card))
check('card: Ask about a change, going to the account manager', card.includes('Ask about a change') && card.includes('Goes to your account manager.'))
const fresh = renderToStaticMarkup(<ErpChangesCardView changes={changes} designs={designs} seenBefore={undefined} ask={{ kind: 'none' }} />)
check('card: before the browser has read its mark, nothing is New', count(fresh, '>New<') === 0)
check('card: a cancelled order has no foot', !fresh.includes('erp-chg__foot'))
const pending = renderToStaticMarkup(<ErpChangesCardView changes={changes} designs={designs} seenBefore={null} ask={{ kind: 'pending', askedOn: 'Oct 25' }} />)
check('card: an open question shows Pending instead of the button', pending.includes('>Pending<') && !pending.includes('<button')
  && pending.includes('You asked about a change on Oct 25.') && count(pending, '>New<') === 4)
check('card: no changes, no card', renderToStaticMarkup(<ErpChangesCardView changes={[]} designs={[]} seenBefore={null} ask={{ kind: 'none' }} />) === '')

// ─── The strip and the chip, drawn ─────────────────────────

const stripHtml = renderToStaticMarkup(<ErpChangesStrip changes={changes.slice(0, 3)} />)
check('strip: the sentence and the link', stripHtml.includes('<b>Dia-Co changed 3 details</b> of what you sent: Size, Metal and Center stone.')
  && stripHtml.includes('<a href="#changes">See the changes</a>'))
check('strip: none without changes', renderToStaticMarkup(<ErpChangesStrip changes={[]} />) === '')
const chipHtml = renderToStaticMarkup(<ErpChangesChipView count={3} fresh={1} />)
check('list chip: count and new, with the dot', chipHtml.includes('order-card__chg') && chipHtml.includes('class="dot"')
  && chipHtml.includes('3 changes by Dia-Co · 1 new'))

// ─── A question in Your requests ───────────────────────────

const req = (over: Partial<ErpRequest>): ErpRequest => ({
  id: Math.random().toString(36).slice(2), kind: 'question', text: 'Why 6.75?', againstV: null, quoteTotal: null, askedBy: 'Jane',
  status: 'pending', createdAt: new Date('2026-10-25T18:00:00Z'), decidedAt: null, note: null, ...over,
})
const asked = renderToStaticMarkup(<ErpYourRequests requests={[req({})]} />)
check('Your requests: an open question with its Pending chip', asked.includes('Question about a change')
  && asked.includes('erp-req__chip--pending">Pending<') && asked.includes('You asked on Oct 25') && !asked.includes('replied'))
const answered = renderToStaticMarkup(<ErpYourRequests requests={[
  req({ status: 'done', decidedAt: new Date('2026-10-26T18:00:00Z'), note: 'Your customer’s ring measured 6.75 at fitting.' }),
  req({ kind: 'approve', againstV: 'v1', text: '', status: 'done', decidedAt: new Date('2026-10-26T18:00:00Z') }),
]} />)
check('Your requests: an answered question, Dia-Co\'s reply in its words', answered.includes('erp-req__chip--done">Done<')
  && answered.includes('You asked on Oct 25 · Dia-Co replied on Oct 26') && answered.includes('Dia-Co: Your customer’s ring measured 6.75 at fitting.'))
check('Your requests: other kinds as before', answered.includes('Approval of v1') && count(answered, 'erp-req__row') === 2)

// ─── The key specs and the full specifications ─────────────

const base: Order = {
  id: 'AB-1320' as Order['id'], poNumber: 'AB-1320', styleNumber: 'R-2251', poEndCustomerName: 'Lou Beck', softwareOrderId: 'AB-1320',
  personalPo: 'PO-88213', customerId: '' as Order['customerId'], productType: 'ring', customStyle: null, size: { value: 6.75, unit: 'US' },
  quantity: 1, finishPoint: 'finished_piece',
  metals: [{ karatId: '18K' as Order['metals'][0]['karatId'], karatLabel: '18K', colorId: null, colorLabel: 'Rose', finish: 'other', estimatedWeightGrams: null, actualWeightGrams: null }],
  stones: { hasCenterStone: false, centerStone: null, accentStones: [] }, engraving: null, description: '', customerAttachments: [],
  currentStage: 'designing', stageDetail: { kind: 'designing', subState: 'awaiting_customer_review', currentCadVersion: 'v1', actionNeeded: null, actionDeadline: null },
  cadVersions: [], priorityRush: { eligibility: 'not_requested', fee: 0, requestedAt: null, reviewedAt: null, reviewedBy: null, denialReason: null },
  submittedAt: new Date(2026, 9, 23, 12), lastUpdatedAt: new Date(2026, 9, 24, 12), expectedShipDate: null,
  shipping: { type: 'back_to_jeweler', recipientName: null, phone: null, address: null, insuredAmount: 0, carrier: null, trackingNumber: null },
  history: [],
}
const erpOrder: Order = { ...base, source: 'erp', portalStatus: 'designing', erpChanges: changes, erpDetails: details }

const tiles = renderToStaticMarkup(<KeySpecs order={erpOrder} amName="Dia-Co" />)
check('tiles: Size, Metal and Center marked, nothing else', count(tiles, 'key-spec is-changed') === 3)
check('tiles: a changed tile says what was sent', tiles.includes('Changed · you sent <s>6.5</s>')
  && tiles.includes('Changed · you sent <s>18K Rose · band · Satin</s>'))
check('tiles: the center stone in the ERP\'s words', tiles.includes('Lab-grown · Oval') && tiles.includes('Natural diamond · HI'))
const portalTiles = renderToStaticMarkup(<KeySpecs order={{ ...base, erpChanges: changes, erpDetails: details }} amName="Anu" />)
check('tiles: a Portal order is never marked (nor reads ERP words)', !portalTiles.includes('is-changed') && !portalTiles.includes('Lab-grown'))

const spec = renderToStaticMarkup(<FullSpecificationsGrid order={erpOrder} />)
check('spec: Metal / Center stone / Accents / Engraving from the ERP\'s words', spec.includes('Platinum · prongs · High polish')
  && spec.includes('2nd: Ruby · Pear · 0.5 ct') && spec.includes('Natural diamond · HI · SI1 · you supply') && spec.includes('“Forever” · Inside shank — Top'))
check('spec: each changed detail has its chip and what was sent', count(spec, 'erp-req__chip--pending') === 4
  && spec.includes('Changed Oct 23') && spec.includes('Changed Oct 24') && spec.includes('Changed Oct 25')
  && spec.includes('You sent <s>6.5</s>') && spec.includes('You sent <s>18K Rose · band · Satin</s>') && spec.includes('Added by Dia-Co'))
check('spec: the unchanged metal has no chip', /erp-chg-plain">Platinum · prongs · High polish</.test(spec))
const portalSpec = renderToStaticMarkup(<FullSpecificationsGrid order={{ ...base, erpChanges: changes, erpDetails: details }} />)
check('spec: a Portal order is never marked (nor reads ERP words)', !portalSpec.includes('erp-chg') && !portalSpec.includes('Platinum'))
const oldErp = renderToStaticMarkup(<FullSpecificationsGrid order={{ ...base, source: 'erp', portalStatus: 'designing' }} />)
check('spec: an older ERP (no changes, no details) shows what it showed before', !oldErp.includes('erp-chg') && oldErp.includes('18K Rose<'))

let failed = 0
for (const [name, ok] of results) {
  if (!ok) failed++
  console.log((ok ? '  ok    ' : '  FAIL  ') + name)
}
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
