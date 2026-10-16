# Dia-Co Portal ↔ Dia-Co Internal (ERP): integration contract

**Status: DRAFT, 2026-10-15.** Items marked **Proposal** or listed under §13 need an owner ruling
before they are built.

**What this is.** The concrete contract between the customer Portal (this repo) and the internal
ERP (`Dia-Co-Portal/Dia-Co-Portal`, remote `rathichandar/Dia-Co-Portal`).

**What it builds on.** The ERP's `files/diaco-internal-context/reference/PLAN_Internal_Portal_Integration.md`
(16 Aug 2026). That plan stays authoritative for direction. This document adds:
- the operations,
- the field and status mappings,
- the security details,
- the work list for each repo.

Where it proposes changing the plan, it says so (§12).

**Who reads it.** Engineers, and Claude Code sessions, working in either repo. Read §2 before
changing anything on either side.

---

## 0. Build status (updated 2026-10-16)

**Step 1a (identity links) WORKS END TO END on ERP staging (2026-10-16).** Nothing is committed.

The first real run:
1. Staff, signed in to the local ERP app, invited `rathichandar101+erp@gmail.com` to the house customer DI10489 (`portal-admin`).
2. The ERP called the Portal's signed `POST /api/erp/invite` through a tunnel: 200, and the email was sent.
3. The email link went `/auth/callback` (`token_hash`) → `/auth/confirm` → Continue → `/reset-password`, and the invitation became `accepted`.
4. `finalizeInvite` called `link.confirm` with no error.

**Lessons from the run:**
- **Supabase's built-in email sender rate-limits invites to a few an hour.** That refusal arrives as `PORTAL_NOT_SENT: … Email rate limit hit`, and the ERP abandons the new invitation. Set up custom SMTP before real invites.
- **Test acceptance in a private window**, or an existing session hides the result.

| Piece | Where | State |
|---|---|---|
| `db/2026-10-15-portal-gateway.sql` | ERP staging (`oncbcrpujxybprrqhglp`) | Applied 2026-10-16. V2 = 2, 2, 0, 0, 3. V3 passed on a real customer and rolled back |
| `20261015000001_erp_invites_and_customer_shells.sql` | Portal (`rnwslatnbcrasjambabt`) | Applied 2026-10-16 |
| `portal-gateway` | ERP staging | **Deployed 2026-10-16** (CLI 2.121.0, `--no-verify-jwt`). Its secrets are set and the Portal's `.env.local` matches. Verified live: unsigned → 401 `PORTAL_UNSIGNED`; a wrong secret → 401; a forged token → 401; a signed call with a real Portal sign-in → 403 "not linked", from `portal_whoami` |
| `portal-admin` | ERP staging | **Deployed 2026-10-16** with the platform JWT check ON (an anonymous call → 401 "Missing authorization header"). `ERP_ADMIN_SECRET` is set on both sides; the local Portal accepts a correctly signed request (200) and refuses a wrong secret (401). **`PORTAL_SITE_URL`** is set to a temporary cloudflared tunnel, which changes on every restart. Reset it each time, or point it at a deployed Portal |
| Invite email template (`token_hash` link) | Portal Auth settings | **Confirmed working 2026-10-16:** the link arrived as `/auth/callback?next=/reset-password&token_hash=…&type=invite` |
| ERP production | — | Nothing applied; it needs the AP foundation SQL and public sign-up turned off first |

**Owner rulings for this step (2026-10-15):**
- Build 1a now. The ERP's Customer Master screen comes later, as Step 1b, with a mockup first, once the ERP's uncommitted 10-14 work is committed.
- D8: a Customer Admin's team invitations are auto-linked in the ERP, and logged.

### ERP repo (`Dia-Co-portal/Dia-Co-Portal`), new files plus one line in `package.json`

- **`db/2026-10-15-portal-gateway.sql`:**
  - Tables `portal_links` and `portal_gateway_log`.
  - The gates `_portal_require()` (service role only) and `_portal_staff()` / `_portal_may()` (Admin and AM).
  - Gateway RPCs `portal_whoami`, `portal_link_confirm` and `portal_gateway_log_add`.
  - Staff RPCs `portal_invite_prepare`, `portal_invite_abandon` and `portal_link_revoke`.
  - **Proven in PGlite:** 12 probes, V2 and V3 included, 8 SQL mutants caught. Not seen against a real database.
- **`supabase/functions/portal-gateway`, `portal-admin`, `_shared/signing.ts`, `_shared/rest.ts`, and a README** (deploy, secrets, a console test). Not run under Deno here; the signing code is cross-checked under Node.
- **`portal.test.js`, now in `npm run check`:** 19 checks, trip-proven with 12 deliberate breaks, all caught. The ERP gate is green at 851.

### Portal repo (this one)

- **Migration `20261015000001_erp_invites_and_customer_shells.sql`:**
  - `customers` rows can be login shells.
  - `pending_invites` gains `erp_invite_ref`, and its inviter may be null.
  - `finalize_pending_invite()` also returns the ERP reference, the inviter and the names.
- **Signing and the gateway:** `src/lib/erp/signing.ts` (the same format, the pinned vector) and `gateway.ts` (signed calls to `portal-gateway`). `scripts/check-erp-signing.ts` (`npm run check:erp-signing`) passes 12/12.
- **`POST /api/erp/invite` and `/api/erp/link-revoke`.** They are signed and POST only. Locally they refuse unsigned and wrong-key requests with 401.
- **Shared invite email:** `src/lib/team/sendInviteEmail.ts`, now used by `createInvite` and the ERP path.
- **`finalizeInvite` → `link.confirm`.** Non-fatal; it is skipped when the ERP isn't configured.

### To run it end to end

1. Apply the Portal migration to the Portal project.
2. Apply the ERP SQL plus V1–V3 to **ERP staging**.
3. Deploy both functions and set their secrets (`supabase/functions/README.md` in the ERP repo).
4. Set the Portal's server env:
   - `ERP_GATEWAY_URL`
   - `PORTAL_GATEWAY_SECRET`
   - `ERP_ADMIN_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. The Portal must be reachable from the internet, so a deployed preview or a tunnel.
6. Invite from the ERP staging console, as the ERP README shows.

**Known limit:** a Customer Admin can revoke an ERP-sent invitation from the Portal's `/team`, and the ERP isn't told. Its link stays `invited` until staff revoke it there. Step 1b's screen should show this.

---

## 1. The design in one picture

The ERP is the system of record. The Portal is the customer's window into it: it displays ERP data
and submits into it. No customer ever signs in to an ERP project. Neither system writes the other's
tables.

```
 Portal (Vercel + Supabase "portal")            ERP (Netlify + Supabase "internal")
 ─────────────────────────────────────          ──────────────────────────────────────────
 Next.js Server Action ──HTTPS POST──►  Edge Function  portal-gateway
   signed with the shared secret          1. check signature + timestamp
   + the customer's own access token      2. verify the token with Portal Auth
                                          3. portal user → customer code (portal_links)
                                          4. log the call, then call ONE RPC as service_role
                                                   │
                                                   ▼
                                          SECURITY DEFINER RPCs  portal_*  (service_role only)
                                            orders · portal_submissions · portal_requests

 Route Handler /api/erp/*  ◄──HTTPS POST──  Edge Function  portal-admin
   (invites; signed, POST only)              (staff action, e.g. Invite to Portal; role checked)
```

---

## 2. What the code says today (facts that shape the design)

### ERP (verified 2026-10-15 against `main`, read only)

| Fact | Where |
|---|---|
| **Production has none of the module SQL.** That includes `_app_ident`, `_ap_capmap`, `integration_outbox`, roles-into-claims and the Done guard. Only staging (`oncbcrpujxybprrqhglp`) has them. Production is `lufayphsvmdstuglrjsk`. | each `db/*.sql` STATUS block |
| **No Edge Functions or server code exist.** There is no `supabase/` folder, no pg_cron and no pg_net. A staging restore does not carry Edge Functions. | repo tree; `files/04_WORKING_PRACTICE.md:96` |
| **An order is one `orders` row.** It has a `data` jsonb holding the whole order, plus ten mirror columns: `style_no, workflow, cad_status, mfg_status, party, customer_name, am, ship_date, customer_code, draft_owner`. It also has `status` (`draft`/`active`/`cancelled`) and `version`. `orderRow` is the one writer of the mirror columns. Readers trust the columns. | `src/app/20-data-core.jsx:245-301`; `files/02_INVARIANTS.md:74-80` |
| **A draft is a real `orders` row.** It has `status='draft'`, no order number and a `draft_owner`. Its `data` holds `{_draft, _draftOwner, _form, _savedAt, customerName, style, createdBy, workflow:"Draft", history:[]}`. `_form` is exactly the New Order form state (`BLANK_ORDER_FORM`). Drafts are visible only to their owner and never reach a list, board or report. | `54-ui-new-order.jsx:261-325`; `22-data-plan.jsx:101,121` |
| **Order numbers are `AB-<n>`.** `issue_order_no()` issues them only when an AM presses Create. Legacy Orderwise orders keep `DG-#####`. | `24-data-invoices.jsx:116`; `54:520` |
| **Customers live in the masters blob.** They are in `manufacturing_data` row `'main'`, `data.customers[]`, not in a table. Orders match a customer by `customerCode` (e.g. `VG10332`), never by id. | `40-engine-seed-customers.jsx:133-140, 192-209` |
| **Order history has one writer, the browser's `logHistory`.** The server does not enforce it. Some action strings are parsed by code. | `42-engine-prints-rjo.jsx:308-316`; `02_INVARIANTS.md:83-85` |
| **Pricing reads two things.** It reads `design.settings` and the centre stone's colour and clarity (`center.color/clarity`). Anything that writes either changes money. | `46-engine-pricing.jsx:12,155`; `02_INVARIANTS.md:40-43,90` |
| **`publishedRendersOf()` is the only place that decides which design is current.** Nothing else may work it out. | `30-design-thread.jsx:157`; `02_INVARIANTS.md:99-102` |
| **The only RPC that writes an order server-side is `fg_receive_order`.** It is the template for a DEFINER order write. | `db/2026-10-12-fg-stock-orders.sql:215-326` |
| **The customer ship-date cushion is decision A3.** The customer's date is the internal date plus two working days. `addBusinessDays` skips weekends only, not holidays. | `docs/decisions.md` A3; `32-storage-dates.jsx:95` |
| **Cancellation is reversible (decision A4).** Restore sets `cancelled=null`. | `56-ui-orders-hub.jsx:694-698` |
| **Security posture.** Public sign-up is ON on both ERP projects. Every RLS policy trusts `authenticated`. Any signed-in user can read the masters blob. | `CLAUDE.md` §Security posture |
| **`portal_codes` / `portal_customers` exist on ERP production.** RLS is on, there are no policies, grants are revoked, and nothing uses them. Their origin is unknown. **Do not build on them.** | `db/2026-09-18-narrow-grants.sql:29,89-90` |

### Portal (this repo)

- **Built:** Phase 2C Sub-sessions 1–4 (auth, roles and permission flags, RLS, cookie-bound writes). Sub-session 5 is built in code: `/team`, `pending_invites`, `finalize_pending_invite`. All of this keeps its value.
- **Out of date:** `PROJECT_CONTEXT.md` and `EXISTING_SYSTEMS_REFERENCE.md` still describe syncing with the old locally hosted software and a stand-alone payments ledger. The ERP plan's §6 lists which Portal decisions that invalidates. Those docs must be updated (§11).

---

## 3. Who owns what

| Data | Owner | Portal's role |
|---|---|---|
| Customers (company, code, terms, AM) | ERP Customer Master | Keeps a login-shell `customers` row per ERP `customer_code` |
| Portal logins (auth users, roles, permission flags) | Portal | Owns them. The ERP keeps the link (`portal_links`) and decides which customer a login belongs to |
| What the customer asked for (the submitted form) | Portal (keeps it verbatim) | Read-only after submit. A copy goes to the ERP as `portal_submissions.payload` |
| The order Dia-Co makes: number, style, spec, CAD, quote, status, ship date | ERP | Reads a projection (§7). Never writes |
| Customer actions: approve, request changes, cancel, rush | ERP (as **requests** an AM acts on) | Submits requests and reads their status. A click never changes order state directly (plan §1) |
| Status wording, stage list, customer ship date | ERP (inside the RPC layer) | Displays what it is given. Holds **no copy** of the rules |
| Messaging, AR, payments | ERP | Later phases (§10) |

---

## 4. Identity and security

### 4.1 Calling the ERP (`portal-gateway`)

- `POST https://<erp-ref>.supabase.co/functions/v1/portal-gateway`.
- Called only from Portal server code (Server Actions and Route Handlers), never from a browser.
- The headers:

| Header | Value |
|---|---|
| `X-Portal-User-Token` | the signed-in customer's Portal access token. A custom header rather than `Authorization`, so it cannot be mistaken for an ERP token |
| `X-Portal-Timestamp` | Unix seconds. The ERP refuses anything more than 300 s off |
| `X-Portal-Signature` | hex HMAC-SHA256 of `timestamp + "." + rawBody`, with `PORTAL_GATEWAY_SECRET` |

- **Body:** `{ "op": "<operation>", "request_id": "<uuid>", "payload": { … } }`.
- **What the Edge Function does, in order:**
  1. **Signature and timestamp.** Mismatched or stale: refuse with `401`.
  2. **The customer's token.** Verify it against the Portal project (`GET <portal>/auth/v1/user` with the token; or JWKS, if the Portal uses asymmetric signing keys).
     - **Proposal:** this goes beyond the plan's shared-secret-only design, so the ERP never trusts the Portal's word about who is calling. That matters before payments (plan §1: "Not tolerable for `portal_record_payment`").
  3. **Resolve the customer.** `portal_links` maps portal user id → `customer_code`. The link must be `active`, and the customer must exist and not be `inactive` in Customer Master. Failure: `PORTAL_FORBIDDEN`.
  4. **Replay.** Every operation is idempotent in the ERP, so a repeated `request_id` gets the same answer. The log keeps one row per `request_id`. No results are stored.
  5. **Call.** Call exactly one `portal_*` RPC with the service key. Pass `p_customer_code` and `p_portal_user` *as resolved in step 3*, never from the body.
  6. **Log.** Write one `portal_gateway_log` row: request id, op, user, customer, ok or error code, duration. **No payloads.**

### 4.2 The RPC gate

- Every `portal_*` RPC starts with `perform public._portal_require();`. It refuses unless `auth.role() = 'service_role'`.
- `revoke execute … from public, anon, authenticated; grant execute … to service_role;`
- Staff sessions therefore **cannot** call them, and customers never hold an ERP token.

### 4.3 Calling the Portal (`portal-admin`)

- A staff member presses a button in the ERP, e.g. **Invite to Portal**.
- The ERP app calls the `portal-admin` Edge Function with the staff member's own ERP session.
- The function checks the role through `_app_ident()` / a `_portal_may()` permission. That needs the ERP foundation SQL on production (§9).
- It then calls a Portal Route Handler, `POST /api/erp/<op>`, signed the same way with a **second** secret, `ERP_ADMIN_SECRET`.
- Portal Route Handlers under `/api/erp/` are POST only (the logout-prefetch lesson). They verify the signature before anything else.

### 4.4 Secrets and environments

**Secrets**
- One gateway secret and one admin secret for each environment pair.
- They live in Supabase secrets (ERP) and in server-only Vercel env (Portal). Never `NEXT_PUBLIC_`.
- The ERP service key exists only inside the ERP Edge Functions' runtime.

**Environment pairs**

| Pair | ERP project | Portal project |
|---|---|---|
| Staging | `oncbcrpujxybprrqhglp` | **to create** (Proposal: a Portal staging project) |
| Production | `lufayphsvmdstuglrjsk` | `rnwslatnbcrasjambabt` (today's only Portal project) |

**Check the project ref in the dashboard URL before every SQL run.** This now means four projects, and the ERP invariant says SQL has been run against the wrong one twice.

**ERP staging is not test data:** it holds real customers. Test Portal logins must link only to customers chosen for testing.

---

## 5. Operations (v1)

**How every operation behaves**
- `request_id` is the idempotency key. A replay returns `{ "ok": true, "noop": true, … }`.
- Errors follow the ERP convention, `'PORTAL_<KIND>: plain sentence -- detail'`. The kinds and errcodes are:
  - `FORBIDDEN` (42501)
  - `INVALID` (23514)
  - `NOT_FOUND` (P0002)
  - `STALE` (40001)
- The Portal shows the server's sentence as written.

### Portal → ERP

| op | RPC | Payload → result | Notes |
|---|---|---|---|
| `whoami` | `portal_whoami` | `{}` → `{customer_code, customer_name, role}` | First call after sign-in |
| `order.submit` | `portal_order_submit` | the Portal order snapshot (§6) → `{submission_id, received_at}` | Idempotent on the Portal order UUID |
| `orders.list` | `portal_orders_list` | `{filter: active\|cancelled\|all, after?, limit≤100}` → `[OrderSummary]` | Paged with a fixed order (ERP rule: never `.limit` past 1,000) |
| `order.get` | `portal_order_get` | `{order_no \| submission_id}` → `OrderDetail` | |
| `order.design` | `portal_order_design` | `{order_no}` → `{version, renders:[signed url], model_url, quote}` | Only while the order is at Client Review or later (§8) |
| `request.submit` | `portal_request_submit` | `{order_no, kind: approve\|modify\|cancel\|rush, text, against_v?}` → `{request_id, status:"pending"}` | Never changes order state |
| `requests.list` | `portal_requests_list` | `{order_no?}` → `[Request]` | |
| `link.confirm` | `portal_link_confirm` | `{invite_ref}` → `{customer_code, role}` | Called once, when an invite is accepted (§9) |

### ERP → Portal

| op | Portal handler | Payload |
|---|---|---|
| `invite.create` | `POST /api/erp/invite` | `{invite_ref, customer_code, customer_name, email, first_name, last_name, role: "customer_admin"}` |
| `link.revoke` | `POST /api/erp/link-revoke` | `{portal_user, customer_code}`: deactivates the Portal login |

### The two result shapes

`OrderSummary` is an explicit allowlist, built field by field in SQL and never by returning `data`:

```json
{ "order_no": "AB-1234", "style_no": "R-2001", "submission_id": "uuid|null", "style": "Ring",
  "phase": "production", "stage": "Setting", "label": "In production — Setting",
  "stages": ["Printing","Casting","Cleaning","Setting","Finishing","Final QC","Shipped"],
  "customer_ship_date": "2026-11-20", "ref_po": "PO-77", "cancelled": false,
  "open_requests": 1, "updated_at": "…" }
```

`OrderDetail` adds `quantity, size, finished_product, metals:[label], submitted_at, approved_at,
shipped_at` and the customer's own submission when there is one.

**Never sent to the Portal:**
- `party`, `designer` / `previousDesigner` / `points`
- `rarUrl` (the CAD source)
- `history[]` raw entries (they carry staff names)
- costs, job cost, `quote.inputs`, `rateOverride`s
- vendor data, internal notes, `cadErrorNote`
- other customers' anything

---

## 6. Order intake: `order.submit`

### 6.1 What happens

1. **The Portal sends its snapshot.** The order, its metals, centre stones and accent stones, as the customer entered them. The key is the Portal order UUID.
2. **`portal_order_submit` does two things in one transaction:**
   - It inserts a `portal_submissions` row: the verbatim payload, `status 'received'`.
   - It inserts a **draft order row**: `status='draft'`, `order_no` null, `draft_owner='portal'`, `customer_code` and `customer_name` set, `workflow='Draft'`, and `data = { _draft:true, _draftOwner:'portal', _form:<mapped form, §6.2>, _savedAt, customerName, style, createdBy:'Portal', workflow:'Draft', history:[], portal:{submission_id, portal_order_id, submitted_by, submitted_at} }`. This is the same shape the browser's own drafts have, so the app's realtime and poll already file it under `drafts`.
   - This is the plan's "real row in a Portal Review state", using the existing draft machinery.
3. **AMs see it in a new Portal Review panel** on New Order: drafts with `_draftOwner === 'portal'`, visible to AM and Admin.
4. **The AM opens it.** The form is pre-filled from `_form`. The AM corrects anything needed and presses **Create** as today. Numbering, style number, roadmap, `logHistory("Order created")` and pricing then all follow the existing path.
5. **Create carries `data.portal`** onto the new order and calls `portal_submission_converted(submission_id, order_id)`.
6. **Instead of Discard, a portal draft offers Decline with a reason.** That is `portal_submission_decline`, and the customer sees the reason.

**Rule:** intake never writes `design.settings`, `quote`, `roadmap`, `shipDate` or any status. Those stay AM decisions, because they are money or commitments.

### 6.2 Field mapping: Portal → ERP `_form`

| Portal field | ERP `_form` key | Rule |
|---|---|---|
| (fixed) | `mode:"CAD"`, `styleType:"New"`, `startPoint:"CAD Instructions"`, `platform:"Website"` | `"Website"` already exists in `PLATFORMS` (`05:81`) |
| customer (resolved, §4.1) | `customerId` | The id of the Customer Master entry whose `code` = the linked `customer_code` |
| `client_po` | `refPo` | Proposal (D6) |
| `end_customer_name` | `personalPo`, or text | **D6**: what "Personal PO" means is unconfirmed |
| `product_type` | `style` | Ring, Earring, Pendant, Necklace and Bracelet map directly. Locks, Charm, Cufflinks and Other become `"Other"`, and the product name goes into `cadInstructions` (D7) |
| `size_spec` | `size` | Only for Ring, Necklace and Bracelet, and only when it is digits with ≤2 decimals (`sanitizeSize`). Anything else goes into `cadInstructions` |
| `quantity` | `quantity` | Integer ≥1 |
| `finish_point` | `finishedProduct` | `file→File`, `wax→Wax`, `raw_casting→Raw Casting`, `polished_mounting→Polished Mounting`, `finished_piece→Finished Piece` |
| metals | `metals:[{metal,color}]` | `"14k Yellow Gold"` → `{metal:"14K",color:"Yellow"}`. Platinum, Silver and Palladium have no colour. Keep the Portal's `display_order`, because ERP weights are positional. Area and surface finish have no ERP field: area goes into `cadInstructions`, finish into `mfgInstructions` |
| centre stone | `center:{source, stoneType, color, clarity, colorText}` | See §6.3. **These feed pricing.** Prefill only exact matches; otherwise leave blank. A blank resolves to no rate, shown red, which is the ERP's own safe behaviour (`02_INVARIANTS.md:31-33`) |
| accent stones | `stones:{source, types:[…]}` | One `types` row per distinct type, colour and clarity. Counts, sizes, shapes and setting styles go into `cadInstructions` |
| stone shapes, mm, carats, certificates, setting styles | (text) `cadInstructions` | **Never** into `design.settings`. Unknown shapes there are priced off the Round chart (`bugs/2026-09-21-shape-fallthrough-to-round.md`) |
| `description`, submission notes | `cadInstructions` | |
| engraving text, positions, logo | `mfgInstructions` (prints on the job card) | The ERP has no engraving field. The logo file is a later phase (§10) |
| `customer_requested_due_date` | (text) `cadInstructions` | There is no ERP field. The ship date is set by the roadmap at approval |
| priority rush | `roadmap:""`, plus a `rush` request (§9) | The AM chooses the roadmap (`"Priority Rush"` exists) |
| ship-to / drop-ship address, shipping method | **D5** | The ERP has no per-order address (only the customer's own). Proposal: a new optional `data.shipTo` key |
| reference images | `images:[]` | Later phase: the gateway copies files into the bucket `order-images` under `intake_portal_<uuid>/ref_…` |

**`cadInstructions` gets one fixed, readable block,** so the AM sees everything the customer said:

```
[Portal order · submitted 2026-10-15 by Jane Smith (jane@heritage.com)]
Product: Cufflinks
Metals: band — 14K White, high polish · head — 18K Yellow, matte
Centre: 1 × Natural Diamond, Oval 7.00 × 5.00 mm, 1.00–1.20 ct, F/G, VS1–VS2, GIA, Dia-Co supplies
Accents: 12 × Lab-Grown Round 1.30 mm, E/F VVS, U Prong, Dia-Co supplies
Wanted by: 2026-11-20
Notes: …
```

### 6.3 Stone vocabulary

| Portal | ERP | Gap |
|---|---|---|
| Natural Diamond / Lab-Grown Diamond / colour stones | `stoneType` `"Diamonds"` / `"Lab Grown"` / `"Color Stone"` + `colorText` (`54:61`) | |
| Colour colour-stone names | `COLOR_STONE_LIST` (`40:44`): Amethyst, Aquamarine, Black Diamond, Citrine, Emerald, Garnet, Morganite, Pearl, Peridot, Ruby, Sapphire, Topaz, Other | Blue/Yellow Sapphire → `Sapphire`; any Topaz → `Topaz`. Pink Tourmaline, Tanzanite and Alexandrite → `Other` + the name |
| Diamond colour D/E, F/G, H/I, J/K | `FG`, `HI`, `JK` (`DIA_COLORS`, `05:92`) | **D/E has no ERP band.** Leave blank + note |
| Clarity I2…VVS1 | `I2, I1, Si2, Si1, Vs2, Vs1, VVS` (exact casing; the rate chart matches only that) | VVS1/VVS2 → `VVS`. The combination must be allowed for its band (JK allows only Vs2, Si1). Otherwise leave blank + note |
| A colour or clarity **range** | one value | Prefill only when the range is a single value. Otherwise leave blank + note |
| Lab grown | `color:"EF"`, `clarity:"VVS"` (forced, `54:48,57`) | Matches the Portal's own lab rule |
| Supply `customer` / `diaco` / `mixed`, or no stones | `source` `"Clients"` / `"Ours"` / (none) / `"No Stones"` | **Mixed has no ERP value.** Leave blank + note. ERP pricing adds a handling fee for `Clients`, and stone value for every row if either source is `Ours` (`46:26,142,192`) |
| Shapes | `SHAPES` (`05:240`) | `Tape Baguette` → `Taper Bag`. Trapezoid and Cadillac have no ERP shape (text only) |
| Setting styles | `Prong`, `U Pave`, `Channel`, `Bezel` (`05:250`) | U Prong, Wall Pave, Single Prong, French Pave and Invisible are text only |
| Product types | `STYLES` (`05:8`) | Locks, Charm and Cufflinks are not in the ERP list |

**D7 asks the owner to choose:** trim the Portal form to the ERP's vocabulary (recommended for
anything that feeds price), or extend the ERP lists. Until then, the "blank plus note" rules above
apply.

---

## 7. Status the customer sees

`_portal_status(orders row)` is SQL inside the ERP. It reads **only** the mirror columns (`status`,
`workflow`, `cad_status`, `mfg_status`, `party`), plus `data->>'startPoint' / 'finishedProduct'` for the
stage list. It returns `{phase, stage, label}`.

| ERP state | `phase` | Customer sees |
|---|---|---|
| Portal submission, still a draft | `received` | Received — Dia-Co is reviewing your order |
| Submission declined | `declined` | Not accepted — *reason* |
| `status='cancelled'` | `cancelled` | Cancelled. Can return to its prior state if Dia-Co restores it (A4) |
| CAD: New Order Request, CAD Assigning, CAD Designing, Admin Review, CAD Error | `design` | Designing |
| CAD: Mod Requested, Redesigning | `design` | Updating your design |
| CAD: Client Review | `review` | Your design is ready for review |
| Manufacturing, `mfg_status` in Freeze / Follow-Up | `on_hold` | On hold |
| Manufacturing, `Approval` | `production` | Approved — scheduling production |
| Manufacturing, any other status | `production` | In production — *stage*. The stage comes from the same table as `roadmapStageOfStatus` (`60:935-968`). If there is none, the label is plain "In production" |
| `workflow='Invoicing'` | `ready` | Final checks done — preparing to ship |
| `workflow='Done'` | `shipped` | Shipped (**D4**: the ERP has no separate ship event) |

**Rules that keep this from drifting:**
- **The stage list is `roadmapStagesFor(startPoint, finishedProduct)`** + `Final QC` + `Shipped` (`34-domain-roadmap.jsx:25`). That function includes `Finishing`, and the plan's six-stage list omits it. **D2.**
- **The mapping lives in a VALUES table in the SQL file.** A new `portal.test.js` checks it two ways:
  - every `CAD_STATUS`, `MFG_STATUSES`, `SIDE_STATUSES` and `READY_INVOICING` value is covered;
  - the stage column equals what the real `roadmapStageOfStatus` returns for every status and party pair (via `engine-load.js`).
- **Add `_portal_status` to the status-rename sweep list** next to `isFinalQC` (`APP_OVERVIEW.md` §5.1).
- **`customer_ship_date` is `ship_date` + 2 business days, skipping weekends only,** to match `addBusinessDays` (`32:95`). A test pins the two to each other. It is null until the order has a ship date (CAD orders get one at approval).

**Which orders a customer sees:** every `orders` row with the customer's `customer_code` and `status <> 'draft'`, plus their own submissions. Whether to include the ~2,420 imported Orderwise (`DG-`) orders, or only those after a cut-off date, is **D11**.

---

## 8. Design review and quote: `order.design`

- **Snapshot at Send to Client Review (Proposal).** When an AM presses **Send to Client Review**, the ERP app writes `data.portal.review` in the same save. It is computed **with `publishedRendersOf()`**, so the "which design is current" rule keeps its single home:
  ```
  { v: versionLabelOf(o), at, renders: [storage paths], model_url: design.modelUrl,
    quote: { lines: [{dept, process, pc, wt, rate|null, qty, amount}], total, caution } }
  ```
- **Quote lines follow `PriceDoc`'s own rules** (`74:41-179`): the rate is hidden when the amount was overridden, RJO lines are included, and the `stoneCaution` flag is carried. Amounts are dollars with 2 decimals, as stored. The Portal displays them and never recomputes them.
- **Renders.** The gateway returns signed URLs for `renders` from the private bucket `order-images`, with a 7,200 s lifetime to match the app's `SIGNED_TTL`.
- **Never included:** `rarUrl`, designer, settings internals and quote inputs.
- **This changes how AMs work.** Today an AM shares renders outside the app; the Portal becomes that channel.

---

## 9. Customer actions, invites and links

### Requests: `portal_requests` (ERP)

- **Columns:** `id, client_key uuid unique, customer_code, order_id, kind ('approve','modify','cancel','rush'), body, against_v, portal_user, portal_user_name, status ('pending','done','declined'), created_at, actioned_by, actioned_at, outcome_note`.
- **Where AMs see them:** on the order (a Portal requests panel) and in a queue.
- **What an AM does:** acts with the existing buttons (Approve, Mod request, Cancel, roadmap), then marks the request done or declined with a note.
- **Realtime:** add the table to the publication so the panel updates live.

### Invites and links

1. **Invite.** In ERP Customer Master, an AM or Admin presses **Invite to Portal**. `portal-admin` creates a `portal_links` row (`status 'invited'`, `invite_ref`, email, `customer_code`, `role 'customer_admin'`) and calls the Portal's `POST /api/erp/invite`.
2. **The Portal reuses Sub-session 5's machinery.** It upserts the login-shell `customers` row by `customer_code`, creates the `pending_invites` row, and sends the email.
3. **Finalise.** On `finalize_pending_invite` success, the Portal calls `link.confirm {invite_ref}` with the new user's token. The ERP checks that the email matches and that the link is `invited`, then sets it `active`.
4. **Team invites.** A Customer Admin inviting their own Sales Reps (`/team`) stays in the Portal. On acceptance the Portal calls `link.confirm`. **D8:** whether the ERP auto-approves links for logins invited by an active Customer Admin of the same customer (recommended), or queues them for an AM.
5. **Self-registration** (plan §1) lands in an ERP Registrations queue. That is a later phase, and the Portal's planned `/admin` approval queue (Sub-session 6) is dropped.

---

## 10. Later phases (unchanged from the plan)

These keep the same edge layer and RPC pattern, with new operations:
- **Messaging:** ERP first, then the Portal, which polls every 10–20 s.
- **AR read-only:** from `ar_invoice_balances` / `ar_customer_positions` / `ar_aging`, filtered to the linked `customer_code`.
- **Payments:** Stripe/ACH, recorded into the ERP's AR as RP- payments.
- **Reference-image transfer.**

The ERP's AR views return nothing unless the caller has `read.ar`, so the gateway needs `portal_*` read RPCs over them rather than the views themselves.

---

## 11. Work list

### ERP repo

1. **Owner prerequisites:**
   - turn off public sign-up on both ERP projects;
   - rotate passwords;
   - apply the foundation and roles-into-claims SQL to production, which `portal-admin`'s role check needs.
2. **`db/<date>-portal-gateway.sql`**, following the repo's conventions: STATUS block, PREFLIGHT, `$$` only, revoke then grant, V-blocks, and a PGlite proof before staging. It contains:
   - **Tables:** `portal_links`, `portal_submissions`, `portal_requests`, `portal_gateway_log`.
   - **Gate:** `_portal_require()`.
   - **Read RPCs:** `portal_whoami`, `portal_orders_list`, `portal_order_get`, `portal_order_design`, `portal_requests_list`.
   - **Write RPCs:** `portal_order_submit`, `portal_request_submit`, `portal_link_confirm`.
   - **Helpers:** `_portal_status()` and `_portal_ship_date()`.
   - **Staff RPCs** for convert, decline and request handling, behind their **own** permission function, `_portal_may`. That follows FG's reason: AP and AR files replace `_ap_capmap` whole.
3. **Edge Functions in a new `supabase/functions/`:** `portal-gateway` and `portal-admin`, deployed with the Supabase CLI. Add "re-deploy functions" to the staging-restore checklist.
4. **App changes:**
   - **New Order:** a Portal Review panel, Create carrying `data.portal`, and Decline with a reason. Update the Drop 11 banner comment, since portal drafts are a shared exception to "visible only to the AM who made them".
   - **Send to Client Review:** write `data.portal.review` (§8).
   - **Order detail:** a Portal requests panel, plus a requests queue.
   - **Customer Master:** Invite to Portal, the linked logins list, and Revoke.
5. **`portal.test.js`, added to the `check` script.** It checks:
   - SQL hygiene;
   - status coverage and stage equality (§7);
   - that `_form` keys equal `BLANK_ORDER_FORM` keys;
   - that no `portal_*` RPC is granted to `authenticated`;
   - the refusal sentences.

### Portal repo (this one)

1. **`src/lib/erp/gateway.ts`** (server only): signs requests, forwards the user's access token, and maps `PORTAL_*` errors to sentences.
2. **Submit:**
   - `submitOrder` calls `order.submit` first, using the order UUID as `request_id`.
   - On success, `submit_order` moves the Portal order to `submitted` (the enum value exists) and stores `submission_id`.
   - On failure the draft stays a draft and the error is shown.
   - It no longer moves the order to `designing`.
3. **Read path:** `/orders`, `/orders/[orderId]` and `/history` read submitted and ERP orders through `orders.list` / `order.get` / `order.design`. The Portal's own order tables remain the drafts plus the customer's as-submitted record.
4. **Actions:** the existing `ApproveDialog` / `ModifyDialog` / `CancelDialog` call `request.submit`.
5. **Invites:**
   - a new `POST /api/erp/invite` and `/api/erp/link-revoke` (signed, POST only);
   - `finalizeInvite` calls `link.confirm`.
6. **Customers:** `customers` becomes a login shell keyed by `customer_code`. Reset the disposable rows, keeping the test logins (**D10**).
7. **Docs:** update `PROJECT_CONTEXT.md` and `EXISTING_SYSTEMS_REFERENCE.md` to point here, and mark the superseded sections.
8. **Form vocabulary:** align it per D7.

---

## 12. Sequencing, and where this proposes changing the plan

| Step | What | Depends on |
|---|---|---|
| 0 | Owner prerequisites (§11 ERP 1). Create the Portal staging project. Rule on §13 | — |
| 1 | Gateway skeleton + `whoami` + invites and links | 0 |
| 2 | **Read path:** customers see their existing ERP orders, status and customer ship date | 1 |
| 3 | **Intake:** `order.submit` → Portal Review → Create or Decline | 1 |
| 4 | Design review + requests | 2, 3 |
| 5 | Messaging → AR read-only → payments (plan steps 7–9) | 4 |

**Proposed changes to the plan, for the owner to rule on:**

1. **D1. Intake does not wait for the orders-schema rebuild** (plan step 3; the read path is still unbuilt per `03_OPEN_QUEUE.md`).
   - Intake writes a draft row shaped exactly like the browser's drafts.
   - Status reads only mirror columns, which survive the rebuild.
   - After the rebuild, only `portal_order_submit` changes, to write through `save_order()`.
2. **The read path ships before intake.** It is read-only, exercises the gateway and identity with no writes, and gives customers value first.
3. **The gateway verifies the customer's own token**, not only the shared secret (§4.1).
4. **A `portal_submissions` ledger sits beside the draft row.** This is a receipt, not a holding area. The draft is deleted at Create, and the customer still needs "received / converted / declined".

---

## 13. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| D1 | Build intake before the schema rebuild? | Yes (§12) |
| D2 | Customer stage list: include Finishing? Short or full path per order? | `roadmapStagesFor` + Final QC + Shipped, Finishing included |
| D3 | Who handles portal drafts? | A shared Portal Review panel (AM and Admin), not one AM's private drafts |
| D4 | Is "Shipped" the same as invoiced (`Done`)? | Yes for v1; add a ship event later if they differ in practice |
| D5 | Drop-ship address and shipping method on ERP orders? | Add an optional `data.shipTo` key and show it on the job card and invoice |
| D6 | `refPo` vs `personalPo`: what does each mean? | `client_po → refPo`; confirm before mapping the end customer |
| D7 | Vocabulary gaps (D/E colour, mixed supply, Locks/Charm/Cufflinks, Trapezoid/Cadillac, five setting styles, colour stones) | Trim the Portal form to the ERP lists for anything that feeds price |
| D8 | Auto-link Sales Reps invited by a linked Customer Admin? | Yes, logged |
| D9 | Portal shows Restore after a cancel (A4)? | Yes: the status follows the ERP |
| D10 | Which Portal test logins survive the customer reset? | (plan §4, open) |
| D11 | Show imported Orderwise (`DG-`) orders to customers? From what date? | Show orders active on or after go-live, plus the last 12 months |
| D12 | The old ASP.NET customer portal: what does it connect to now, and when is it retired or redirected? | Needs an answer before Portal go-live |

---

## 14. Sources

**ERP repo:**
- `APP_OVERVIEW.md`, `CLAUDE.md` (security posture)
- `files/02_INVARIANTS.md`, `docs/decisions.md`, `files/03_ROADMAP_AND_DECISIONS.md`
- `files/diaco-internal-context/reference/PLAN_Internal_Portal_Integration.md`, `03_OPEN_QUEUE.md`, `05_STALE_AND_CONFLICTS.md`
- `src/app/` parts 05, 20, 22, 26, 30, 32, 34, 36, 37, 40, 42, 46, 48, 54, 60, 62, 74
- `db/` foundation, roles-into-claims, narrow-grants, invoice baseline, AR core, FG stock-orders

**This repo:** `PROJECT_CONTEXT.md`, `SCHEMA.md`, `supabase/migrations/`, `src/lib/orders/`, `src/lib/team/`.

**Not verified** (no DDL in the ERP repo): the `orders` table's creation script and policies, `issue_order_no`, `touch_row`, and the roadmap seed table.
