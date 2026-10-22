# Step 4a (design review): bugs from the browser run

**Found:** 2026-10-20, by a browser agent that drove the ERP (staging) and the Portal (local) on test order **AB-1310**.
**Status (2026-10-21):**
- **Bugs 1, 2 and 4 are fixed in the Portal, uncommitted.** Type check and lint pass. Bug 1 was checked in a headless harness over the real CSS, at 1–6 renders and two widths. **None has been seen live on AB-1310 yet.**
- **Bug 3 (ERP) is fixed too** (2026-10-21, owner: give the number back), uncommitted. `portal.test.js` holds it with a check proven to fail without the fix; the ERP gate is green. **Not seen live yet.**

**To do later:**
1. **See all four fixes live on AB-1310** (steps under each bug's "Check"). Bug 3 first: the ERP's note should then say v2.
2. **Commit the fixes** in both repos once they've been seen live.
3. **The untested paths** under "Not covered by the run".
**Context:** `ERP_INTEGRATION_CONTRACT.md` §0 (Step 4a) and §8. Step 4a otherwise passed end to end.

| # | Repo | What the customer or AM sees | Size |
|---|---|---|---|
| 1 | Portal | Renders are hidden when an order has fewer than 5 | CSS + a little TSX |
| 2 | Portal | The stage ribbon says "First CAD coming" while a design is on screen | A few lines |
| 3 | ERP | After undoing a send, the next version is numbered v3 when the customer saw only v1 | Small; ruled (give it back) and fixed 2026-10-21 |
| 4 | Portal | The header says "review CAD v1 and approve", but there is no Approve until Step 4b | One line |

All four were fixed on 2026-10-21 (bug 4's wording then changed again with Step 4b, which brought Approve).

---

## Before you start

- **Repos.**
  - Portal: `C:\Users\Chandar\Desktop\diaco-portal-main`. Read `AGENTS.md` first: this Next.js version differs from training data.
  - ERP: `C:\Users\Chandar\Desktop\Dia-Co-portal\Dia-Co-Portal`. Read its `CLAUDE.md`. `npm run check` is its gate; the app is assembled by `build.js`.
  - From a Portal session, treat the ERP repo as read-only unless the owner asks.
- **Running both apps.**
  - Portal: `npm run dev` → http://localhost:3000. Its `.env.local` already points at ERP staging.
  - ERP: `npm run serve` → http://localhost:8765/, opened in the verification Chrome (`npm run chrome`, CDP on 9222).
  - **Reload the ERP tab after any ERP rebuild.** During the run it was still on an older build and showed none of Step 4a until reloaded.
- **Accounts.** Never type passwords; if either app is at its login screen, a person signs in.
  - Portal: `rathichandar101+erp@gmail.com`, the login linked to ERP customer **DI10489 "DIA-CO INVENTORY"**.
  - ERP: signed in as Chandar (Admin).
- **The test order, AB-1310, is a live repro for bugs 1–3 right now.** Leave it as it is until the fixes are checked.
  - **ERP:** CAD · Admin Review. The live design is v2 (1 render), the quote is $224.00, `clientV` = 2, and `portalReviews` holds v1 only.
  - **Portal** (`/orders/AB-1310`): v1 is the latest, with 3 renders and the $174.00 quote. The rail says "Working on v2"; the ribbon says "First CAD coming".
  - **In the ERP's Orders search, type `AB-1310`.** That search box matches order number, style, Ref PO and status, not customer code.

---

## Bug 1: the gallery hides renders when there are fewer than 5 (Portal)

> **Fixed 2026-10-21.**
> - **What changed:**
>   - `.cad-hero__thumbs` is now a fixed 2×2 grid with `minmax(0, 1fr)` tracks and `contain: size`, so it can't grow the card.
>   - The thumbnails fill their cells; `aspect-ratio: 1` is gone.
>   - `data-count` lays out 1 thumbnail (fills the column), 2 (stacked) or 3 (the third spans the bottom row).
>   - A single render sets `data-solo`: the hero spans the card at the same height, with `object-fit: contain`.
>   - With more than 5 renders, the last thumbnail shows "+N more".
> - **Harness result:** before the fix, thumbnail 3 of 3 was 0% visible, and with 4–6 renders the right-hand column was 82% visible. After it, every thumbnail is 100% visible at 760px and 600px for 1–6 renders, and the hero height is unchanged.
> - **The harness:** `make-harness.mjs` in the scratchpad's `gallery\` folder (path under Evidence).

**What happens.**
- AB-1310's v1 has 3 renders: one hero and two thumbnails.
- Thumbnail 2 fills the whole right column and is clipped. Thumbnail 3 is not visible at all.
- Measured at a 2000px-wide window: the hero was 600px wide. The two thumbnails were 412px squares at x=1201 and x=1614, in a column about 375px wide.
- The lightbox still reaches every render.

**Why.**
- The gallery was built for Phase 1 mock data, which always had 5 renders. `CadHeroGallery.tsx:6` says so: "renders[1..5] are the four small thumbs (always)".
- ERP designs have any number of renders.
- **The rules involved**, all in `src/app/diaco-design.css`:
  - `.cad-hero` (L477–481): `grid-template-columns: 1.6fr 1fr`, `overflow: hidden`.
  - `.cad-hero__main` (L482–): `aspect-ratio: 16/11`.
  - `.cad-hero__thumbs` (L510–513): `grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr`.
  - `.cad-hero__thumb` (L514–519): `aspect-ratio: 1`.
- **What goes wrong:**
  - With 1–2 thumbnails there is one grid row, and it stretches to the hero's full height.
  - `aspect-ratio: 1` then makes each thumbnail as wide as that height, which overflows the column.
  - `overflow: hidden` on `.cad-hero` clips the overflow.
- No `@media` rule touches `.cad-hero`.
- **The component:** `src/components/orders/CadHeroGallery.tsx`. L44–45 take `renders[0]` as the hero and `slice(1, 5)` as the thumbnails; L88–95 render them.

**Fix (suggested).** The thumbnail grid should fit inside the column for any count from 0 to 4:
- 1 thumbnail: fills the column.
- 2: stacked.
- 3–4: a 2×2 grid. Keep 4 as it looks today.
- A single render (no thumbnails): let the hero span both columns, or leave the column empty, whichever looks right against `DETAIL_DESIGN_REFERENCE.md`.

The simplest route is a class or `data-count` on `.cad-hero__thumbs` with explicit `grid-template-rows` per count, and the thumbnails filling their cells (`height: 100%`) instead of `aspect-ratio: 1`. Also:
- **More than 5 renders:** check that the extras are still reachable in the lightbox.
- **Fix the L6 comment** so it no longer says there are always four.

**Check.** On AB-1310 (3 renders), every thumbnail is fully visible inside the card, with no overflow. Then check 1, 2, 4 and 6+ renders, either through the ERP on AB-1310 or with a mock. Test at about 1280px and 1920px wide.

---

## Bug 2: "First CAD coming" while a design is on screen (Portal)

> **Fixed 2026-10-21.**
> - **What changed:** in `fetchErpOrderPage`, once versions exist, `awaiting_first_cad` becomes `awaiting_modifications`.
> - **What the order page then shows at Admin Review (v2 and later):**
>   - the ribbon: "Working on your modifications";
>   - the header pill: "Redesigning", where before it showed none.
> - **The `/orders` list still says "Design in progress"** there, which is still true.

**What happens.**
- AB-1310 is at ERP Admin Review with v1 already shown to the customer.
- The Portal's stage ribbon reads **"Designing · First CAD coming"**.
- At the same moment, the rail says "Working on v2" and the gallery shows v1.
- The same happens at every Admin Review or CAD Error after the first showing: the normal v2, v3… flow.

**Why.**
- **ERP:** `db/2026-10-16-portal-orders-read.sql:87–95` (`_portal_status`) maps **Admin Review** (L90) and **CAD Error** (L91) to `awaiting_design`, whether or not the customer has seen a version. `_portal_status` takes no version count, so it can't tell.
- **Portal:**
  - `src/lib/erp/erpOrders.ts:293–297` (`designingSubState`) maps `awaiting_design` to `awaiting_first_cad`.
  - `src/components/orders/StageRibbon.tsx:93–94` prints that as "First CAD coming".
  - `src/lib/erp/erpOrders.ts:451–456` (`fetchErpOrderPage`) already knows whether versions exist. It sets `currentCadVersion` from them but never corrects the sub-state.
- **The `/orders` list is fine.** `statusText` (`erpOrders.ts:105–112`) says "Design in progress" for `awaiting_design`, which is true for any version.

**Fix (suggested, Portal only).** In `fetchErpOrderPage`, after setting `currentCadVersion`: when versions exist and the sub-state is `awaiting_first_cad`, set it to `awaiting_modifications` instead. That label is "Working on your modifications", which matches what the rail says.
- If that wording is wrong for a CAD Error raised without a customer request, a neutral label such as "Working on the next version" is the alternative.
- No ERP change is needed.

**Check.** Reload `/orders/AB-1310`. The ribbon no longer says "First CAD coming" while v1 is shown. Then check that an order that has never been sent a design still says "First CAD coming".

---

## Bug 3: undoing a Send to Client Review doesn't give the version number back (ERP)

> **Fixed 2026-10-21** (owner: give the number back), uncommitted.
> - **What changed:** `undoMove` (`src/app/78-ui-tools.jsx`). When the move undone went from Admin Review to Client Review, it lowers `clientV` by one and clears the `cv` stamp that send left on the archived version. This also covers sends made before Step 4a, whose history lines carry no `portalReview`.
> - **Held by:** a `portal.test.js` section H check, proven to fail without the fix. The ERP gate is green.
> - **AB-1310 still has `clientV` = 2 from the earlier undo.** The fix only applies to undos from now on, so the ERP's next send there is still numbered **v3**. To check the fix, send and undo once more: the note should then say the same number before and after.

**What happens.**
- On AB-1310, v1 was sent, then v2, then the v2 send was undone in Transactions.
- The Portal correctly went back to v1 only.
- But the ERP's `clientV` stayed at 2. The note under Send to Client Review now reads: "Portal: sending also shows the customer **v3** there, with its 1 render, the 3D model and the saved quote ($224.00)."
- The customer saw v1, and will next see v3.

**Why.**
- **`src/app/60-ui-order-detail.jsx:69–78` (`clientReview`):**
  - raises `o.clientV` (L71);
  - stamps the latest archived design version with `cv` (L73);
  - appends to `o.portalReviews`.
- **`src/app/78-ui-tools.jsx:264–301` (`undoMove`):** removes the `portalReviews` entry (L299–300), but leaves `clientV` and that `cv` stamp alone.
- **The Portal assumed the opposite.** `src/lib/erp/erpOrders.ts:383` says "an undone send can reuse one", and `toCadVersions` de-duplicates repeated labels for that case.

**Needs a ruling before anyone codes it.**
- `clientV` means "times the client saw it" (`60-ui-order-detail.jsx:63–65`, `30-design-thread.jsx:53–56`), and rounds the customer saw count (`60-ui-order-detail.jsx:179–181`, `archivedRoundsOf()`).
- Leaving `clientV` raised after an undo predates Step 4a.
- With the Portal, a customer may really have seen the undone version in the minutes before the undo. So the owner should rule: **does undoing a send give the number back?**
- **Recommendation: yes.** The Portal already takes that version away, so the customer is told they never had it. Numbering the next one v3 is the confusing outcome.

**Fix, if ruled yes.** In `undoMove`, when the undone line is a Send to Client Review (it carries `portalReview`):
- lower `o.clientV` by one;
- clear `cv` on the archived version that send stamped.

Undo is only offered on the last move, so no later send can depend on that number. Then:
- add a check to `portal.test.js` section H;
- run `npm run check`;
- `node build.js --accept` per the ERP's CLAUDE.md;
- reload the ERP tab.

**Check.** On any test order at Admin Review, note the version the "Portal:" line names (vN). Send to Client Review, then undo it in Transactions: the line must name vN again, not vN+1. (AB-1310 keeps the raised number from the run before the fix, so its next send is v3 either way.)

---

## Bug 4: the header asks the customer to "approve" with no Approve button (Portal)

> **Fixed 2026-10-21.**
> - **ERP orders:** the header now reads "review CAD v1" (`order.source === "erp"`).
> - **Phase 1 orders:** they keep "…and approve".
> - **Step 4b:** put "and approve" back for ERP orders when Approve ships.

**What happens.**
- At Client Review the order header reads "NEEDS REVIEW · Action: **review CAD v1 and approve**".
- But the ERP-order page has no Approve control until Step 4b. The rail tells the customer to reply to their account manager instead.

**Why.** `src/components/orders/OrderHeader.tsx:98–110` (`computeActionLabel`) returns `review CAD ${v} and approve` (L106) for every order at `awaiting_customer_review`, ERP orders included.

**Fix (suggested).**
- For ERP orders (`order.source === 'erp'`), say "review CAD v1" until Step 4b ships Approve.
- Step 4b then puts "and approve" back.
- Keep the Phase 1 (non-ERP) wording as it is.

**Check.** It needs AB-1310 at Client Review. That means a send, which is better done after bug 3, or the number will be v3. The evidence is in screenshot `D2_portal_v1.png` below.

---

## Not covered by the run (test when convenient)

- **Signed links:** a link expiring (2 hours), and the `renders_unavailable` message.
- **Quote extras:** the stone caution, RJO lines and the "Added" tag. The run's custom quote line came through as `added: false`.
- **The Portal note** staying hidden for a customer with no Portal login.
- **Other customers** being unable to see AB-1310.
- **The "Approved" rail state.**
- **The ERP's realtime update** from a second tab.
- **The Portal server log** during the run, which was in a person's terminal.

## Evidence

Screenshots and the agent's harness scripts are in the scratchpad folder from the session that ran the test. It is temporary and may be cleaned up:
`C:\Users\Chandar\AppData\Local\Temp\claude\c--Users-Chandar-Desktop-diaco-portal-main\6639b01c-8ddf-4785-8a60-d61faed09153\scratchpad\step4a\`

- `D2_portal_v1.png`: bug 1 (thumbnail 3 hidden) and bug 4 (the header).
- `F3_portal_after_undo.png`: bug 2 (the ribbon after the undo).
- `F4_erp_final_card_note_v3.png`: bug 3 (the note says v3).
- `G1_leak_v1v2.json`, `G2_leak_after_undo.json`: the leak scans. They passed.
