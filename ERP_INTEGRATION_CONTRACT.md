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

## 0. Build status (updated 2026-10-20)

**Step 4a (design review: the customer sees the design and the quote) is BUILT (2026-10-20). The SQL is applied on ERP staging and `portal-gateway` is redeployed with `order.design`; the new ERP build is not run yet.**
- **The design** is the mockup approved on 2026-10-20 (claude.ai artifact `RU5kznD8fYYRWSx6dS12XT`), with the owner's rulings:
  - the quote shows line for line as the printed quote;
  - every version sent stays viewable;
  - orders already at Client Review get a one-time fill before go-live (not built).
- **ERP app:**
  - **Send to Client Review** saves what the customer sees (§8) in the same save. Undo takes it off.
  - **For a customer with an active Portal login,** a line under the buttons says what they will see. It turns amber when no quote will go with it.
  - **Single homes in part 74:** `PriceDoc` and the Portal copy share `priceCellsOf`, `unpricedStonesOf` and the paper's two sentences.
- **ERP SQL:** `db/2026-10-20-portal-design-review.sql` (`_portal_review_json`, `portal_order_design`). Proven in PGlite: 17 probes, 15 mutants (14 caught, 1 equivalent).
- **Gateway:** new operation `order.design`. It signs the render paths and returns links only.
- **The gate:** `portal.test.js` section H has 10 checks, trip-proven against 15 breaks. The ERP gate is green at 903 (deployable `8968fa23…`). Uncommitted.
- **Portal:**
  - **Data:** `fetchErpOrderPage` also asks for `order.design`, and the order page shows the versions in the existing gallery and version picker. `CadVersion.quote` is now nullable, and ERP versions carry `erpQuote`.
  - **New components:** `ErpQuoteCard` (the printed quote's columns, caution and disclaimer) and `ErpReviewRail` (awaiting your review / working on the next version / approved).
  - **For ERP orders:** the Phase 1 placeholder Approve, Modify and Rush controls are not shown. A "your design is being made" note shows before the first design.
- **To switch it on, in this order:**
  1. ~~The ERP SQL plus V1–V3, on ERP staging (`oncbcrpujxybprrqhglp`).~~ **Applied 2026-10-20 by the owner.** Verified live: `portal_order_design` exists, and a publishable-key call is refused with 42501, the same as `portal_whoami`. The V-block results weren't recorded.
  2. ~~Redeploy `portal-gateway`.~~ **Done 2026-10-20** (CLI 2.121.0, `--no-verify-jwt --use-api`, from the ERP's uncommitted working tree after `portal.test.js` passed 65/65). Verified live: unsigned → 401 `PORTAL_UNSIGNED`; an unknown operation → 400; a signed `order.design` with a dummy token → 401 `PORTAL_FORBIDDEN`, so the operation is known. Until the SQL is applied, `order.design` fails and the Portal shows ERP orders without their designs, as before.
  3. Run the new ERP build, then send a design to Client Review on a linked customer's order (DI10489) and open it in the Portal.
- **Verified end to end on staging (2026-10-20, a browser agent on AB-1310, DI10489):**
  - **Before the send:** the Portal showed no design, at New Order Request and still at Admin Review.
  - **The Portal note:** amber with no quote; plain once a $174.00 quote was saved.
  - **v1 sent:** 3 renders, all signed links that load; the model link; the quote line for line; "Awaiting your review".
  - **v2 sent:** both versions in the picker, v1 still viewable with its own quote.
  - **Undo of v2:** v2 left the Portal.
  - **No leaks** in the HTML or RSC payload: no designer, raw paths, RAR or settings. No console errors.
  - **Left on staging:** AB-1310 at Admin Review, with v1 on the Portal.
- **Bugs that run found (not fixed yet):**
  1. **The gallery hides renders when there are fewer than four.** With 3, thumbnail 3 is invisible and thumbnail 2 is clipped (`diaco-design.css`, `.cad-hero__thumbs` `grid-auto-rows: 1fr` with `aspect-ratio: 1`). The lightbox still reaches them.
  2. **At Admin Review for v2 and later, the ribbon says "First CAD coming"** while v1 is on screen. The ERP sends `awaiting_design`, and `fetchErpOrderPage` doesn't adjust it when versions exist.
  3. **ERP: Undo of a Send to Client Review leaves `clientV` raised,** so the next send is numbered v3 after the customer saw only v1 (`undoMove`, part 78).
  4. **The header says "review CAD v1 and approve"** with no Approve control until Step 4b.
- **Known limits:**
  - Approve and Request changes from the Portal are Step 4b; until then the card sends the customer to their AM.
  - Signed links last 2 hours; a reload makes new ones.

**Step 1b (Portal access on the ERP's Customer Master) WORKS END TO END on ERP staging (2026-10-20).** It is ERP client code only: its SQL and `portal-admin` came with Step 1a and are on staging. The Portal doesn't change.
- **The design** is the mockup approved on 2026-10-20 (claude.ai artifact `JWM4PWKpndoS7Wft3weN7z`).
- **What Admin and AM get** (the seats with `portal.read`, `.invite` and `.revoke`):
  - A **Portal** column on Customer Master (n active · n invited · n ended) and a **Portal** button on each row. Neither appears where `portal_links` can't be read.
  - The **Portal access** card lists the customer's logins and invitations, open ones first, each with who added it: a staff name, or "Their Customer Admin, in the Portal".
  - **Send again** on an invited row, and **Revoke…** with a required reason, decided in the card.
  - **Invite a Customer Admin** (first name, last name, email). It is refused up front for a customer marked OLD.
- **How it acts:** it reads `portal_links` and acts only through `portal-admin` (`invite` / `revoke`), which calls the Portal's `/api/erp/invite` and `/api/erp/link-revoke`. A revoke the Portal didn't confirm shows as a warning, "Revoked here".
- **The gate:** `portal.test.js` section G has 5 checks, trip-proven against 8 breaks. The ERP gate is green at 893. Uncommitted.
- **Then Customer Master went full width** (2026-10-20, owner): with the Portal column, its table no longer fit the shell's 1320px cap, so it now gets the full window as QC does. Deployable `dc0a295b…`.
- **The browser run (2026-10-20).** The Portal ran behind a cloudflared tunnel, with staging's `PORTAL_SITE_URL` pointed at it and dev auto-login off while the tunnel was open. On DI10489:
  - **Invite:** `rathichandar101+erp1b@gmail.com` showed as Invited. The Portal's `POST /api/erp/invite` answered 200, and a pending invitation appeared there.
  - **Send again:** "the same invitation". The Portal answered 200, and no new row appeared.
  - **Revoke:** the button stayed disabled for an empty or blank reason. With a reason, the row became Revoked by Chandar, `/api/erp/link-revoke` answered 200, and the Portal's invitation became `revoked`.
  - The main linked login (`rathichandar101+erp@gmail.com`) stayed Active. No exceptions and no dialogs.
- **Before the next invite:** `PORTAL_SITE_URL` still names that tunnel, which is now closed. Reset it to a new tunnel, or to a deployed Portal.

**Step 3 (order intake) WORKS END TO END on ERP staging (2026-10-19).**
- **Applied and deployed:** the owner applied both SQL files, and `portal-gateway` was redeployed. Verified live: `order.submit` and `submissions.list` are known operations.
- **The browser run:** a browser agent drove both apps:
  - A Portal order became AB-1310 (receipt `converted`, its draft gone, the Portal card now `AB-1310 · Agent Create`).
  - A second order was declined. It came back on the Portal's Drafts tab with the reason, and "Edit and send again" reopened it with the reason shown.
  - No console or server errors.
- **The bug it found first, in the ERP's own save:**
  - `applyPlan` read *any* duplicate key as "already inserted". So a duplicate order number deleted the draft without creating the order.
  - Fixed: only the primary key counts now, covered by `applyplan.test.js`.
  - The first Portal order (receipt `086557cc…`, "Testing - connection") was left `received` with no draft. It still shows "No. pending" in the Portal, and no repair tool was built (owner, 2026-10-19).
- **Not covered by the run:** the amber "couldn't hold" box on a fresh order (neither test order produced notes), a resend after a decline making a new receipt (proven in PGlite only), and the screens under a non-Admin AM.
The design is the mockup approved on 2026-10-19 (claude.ai artifact `7HyXPqxiJsaCCtsME9X4vw`), with the owner's rulings D1, D3 and D5–D7 (§13).

- **ERP SQL:** `db/2026-10-19-portal-order-intake.sql`.
  - **The receipts table:** `portal_submissions`.
  - **The mapping:** `_portal_intake_form`. Its lists are held equal to the app's own.
  - **Gateway RPCs:** `portal_order_submit` and `portal_submissions_list`.
  - **Staff RPCs:** `portal_submission_claim`, `_release` and `_decline`, under the new right `portal.intake` for Admin and AM.
  - **The orders trigger:** `portal_orders_guard`.
  - **Proven in PGlite:** 27 probes, 17 mutants caught.
- **Gateway:** new operations `order.submit` and `submissions.list`.
- **ERP app:**
  - **New Order (part 54):**
    - A **Portal orders** panel that every AM and Admin sees.
    - Opening a Portal order shows a banner, the list of things the form couldn't hold, a locked customer and the ship-to.
    - Create claims first, then runs the ordinary Create.
    - Decline is done in the page, with a reason.
  - **Elsewhere:** a count on the "+ New Order" tab (part 90), a "From the Portal" strip and Ship to on the order (part 60), and ship-to editing in Edit details (part 58).
  - **The gate:** `portal.test.js` has 50 checks, and the 19 new ones are trip-proven against 12 breaks. The ERP gate is green at 882.
- **Portal:**
  - **Migration:** `20261019000001_erp_order_intake.sql` adds the `orders.erp_*` columns and the RPCs `record_erp_submission` and `reopen_declined_order`.
  - **Code:**
    - `src/lib/erp/orderSnapshot.ts` and `erpSubmissions.ts`, a new `submitOrder`, and `reopenDeclinedOrder`.
    - The Received card and the Declined drafts.
    - "Sent to Dia-Co" and the decline banner on the reopened form.
  - **Without the ERP:** when it isn't configured, Submit works as before (`submit_order` → designing).

**To switch Step 3 on, in this order:**
1. **The Portal migration**, on the Portal project (`rnwslatnbcrasjambabt`). Apply it BEFORE running the new Portal code, because the resume form reads `erp_decline_reason`.
2. **The ERP SQL plus V1–V4**, on ERP staging (`oncbcrpujxybprrqhglp`). V3 runs the whole path and rolls it back; V4 shows what one order maps to.
3. **Redeploy `portal-gateway`.**
4. **Run the new ERP build.** An older build would drop `data.portal` on Create, and the trigger would treat the result as an ordinary order.
5. **Submit an order** from a linked Portal login. Then, in the ERP, open it from Portal orders and Create it; and decline a second one.

**Known limits:**
- **Reference images and the engraving logo** don't cross yet (§10).
- **The ship-to is saved on the order** but not printed on the job card or the invoice yet.
- **A Received card has no order page** until an AM creates the order.
- **A customer can still edit the Portal's copy of a sent order** with a crafted request (the RLS allows `submitted`). The ERP keeps its own copy of what was sent, so only the Portal's display could drift.

**Step 2 (read path) is applied on ERP staging.** This is inferred: a linked login read ERP-only orders through it on 2026-10-16, and the V-block results weren't recorded.

- **ERP:** `db/2026-10-16-portal-orders-read.sql`. Proven in PGlite: 14 probes, 10 mutants caught.
- **Gateway:** new operations `orders.list` and `order.get`.
- **`portal.test.js`:** 31 checks at the time, the new ones trip-proven against 12 breaks.
- **Portal:**
  - `src/lib/erp/erpOrders.ts` feeds `/orders` and `/orders/[orderId]` for linked customers.
  - Any ERP failure falls back to the Portal's own tables, so nothing breaks if the Portal code goes out before the ERP side.

**`portal-gateway` was redeployed 2026-10-16 with `orders.list` and `order.get`.** Verified live: an unlinked login is refused at `portal_whoami` before any order is read; an unknown operation → 400.

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

**Known limit:** a Customer Admin can revoke an ERP-sent invitation from the Portal's `/team`, and the ERP isn't told. Its link stays `invited` until staff revoke it there. Step 1b's card says so under the list whenever an invitation is open.

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
| `order.submit` | `portal_order_submit` | `{order: <snapshot, §6>}` → `{submission_id, status, received_at}` | Idempotent on the Portal order UUID while a receipt is open; after a decline, a resend makes a new receipt. Who sent it comes from the verified token |
| `submissions.list` | `portal_submissions_list` | `{}` → `{submissions: [{submission_id, portal_order_id, status: received\|converted\|declined, received_at, decided_at, order_no, decline_reason}]}` | The latest receipt of each Portal order of the last 12 months: the open one, else the newest declined. Never who decided |
| `orders.list` | `portal_orders_list` | `{filter: active\|cancelled\|all, after?, limit≤100}` → `[OrderSummary]` | Paged with a fixed order (ERP rule: never `.limit` past 1,000) |
| `order.get` | `portal_order_get` | `{order_no \| submission_id}` → `OrderDetail` | |
| `order.design` | `portal_order_design` | `{order_no}` → `{order_no, renders_unavailable, versions: [{v, at, renders:[signed url], model_url, quote}]}`, oldest first | Every design sent for Client Review (§8); none before the first |
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

**As built, 2026-10-19.** This replaces the first draft's `portal_submission_converted` call with a claim plus an orders trigger.

1. **The Portal sends its snapshot.**
   - `buildOrderSnapshot` reads the draft, its metals, centre stones and accent stones from the Portal's own tables, on the server. It sends names, not ids.
   - `submitOrder` sends the snapshot as `order.submit {order}`. The key is the Portal order UUID.
2. **`portal_order_submit` does two things in one transaction:**
   - It inserts a `portal_submissions` row: the verbatim payload, the notes, `status 'received'`.
   - It inserts a **draft order row**: `id = 'P' + <receipt uuid, no dashes>`, `status='draft'`, `order_no` null, `draft_owner='portal'`, `customer_code` and `customer_name` as Customer Master spells them, `workflow='Draft'`, `am='Portal'`, and `data = { _draft, _draftOwner:'portal', _form:<mapped form, §6.2>, _savedAt, customerName, style, createdBy:'Portal', workflow:'Draft', history:[], portal:{submission_id, portal_order_id, customer_code, submitted_by, submitted_email, submitted_at, notes} }`.
   - This is the same shape the browser's own drafts have, so the app's realtime and poll already file it under `drafts`.
   - `portal.notes` holds one sentence per thing the form couldn't hold.
   - The Portal then calls `record_erp_submission`, and its copy becomes `submitted`.
3. **AMs see it in the Portal orders panel** on New Order: drafts with `_draftOwner === 'portal'`, oldest first, visible to AM and Admin. The "+ New Order" tab shows the count.
4. **The AM opens it (Review).**
   - The form is pre-filled from `_form`.
   - Above it: who sent it, and the list of things the form couldn't hold.
   - The customer is locked, and the ship-to is editable.
   - Opening stamps `_reviewBy` / `_reviewAt`, a notice for the panel ("X opened it"), not a lock.
   - The autosave only ever updates this draft; it never inserts one.
5. **Create:**
   - It presses `portal_submission_claim` first, BEFORE `issue_order_no`. A second AM is told who has it and uses up no number.
   - Then the ordinary Create runs, carrying `data.portal` and `data.shipTo`.
   - Inserting the order fires the **orders trigger**. It marks the receipt `converted` (`order_id`, `order_no`, `decided_by`) and deletes the Portal draft, in the same transaction.
   - A save that doesn't land releases the claim.
6. **Decline, with a reason, in the page.**
   - `portal_submission_decline` marks the receipt `declined` and deletes the draft.
   - The customer sees the reason on their Drafts tab, and "Edit and send again" reopens the order (`reopen_declined_order`, after the gateway confirms the decline). A resend makes a new receipt.

**The orders trigger (`portal_orders_guard`) is the guarantee:**
- A Portal draft can be inserted only by `portal_order_submit`. It checks a transaction-local flag.
- A Portal draft's receipt, owner and status can't change. Its form can.
- An order carrying `data.portal.submission_id` can be inserted only while that receipt is `received`, and only for its customer. So one Portal order is never two orders.
- **The fast path:** an ordinary order's UPDATE returns after two compares.

**What the customer sees:**
- **Received:** a "Received" card, with no number and no page.
- **Created:** the ERP order, keeping their own label (end customer, sender) from the Portal's copy.
- **Declined:** back in Drafts with the reason.

**Rule:** intake never writes `design.settings`, `quote`, `roadmap`, `shipDate` or any status. Those stay AM decisions, because they are money or commitments. `portal.test.js` (F) holds this.

### 6.2 Field mapping: Portal → ERP `_form`

| Portal field | ERP `_form` key | Rule |
|---|---|---|
| (fixed) | `mode:"CAD"`, `styleType:"New"`, `startPoint:""`, `platform:"Website"`, `personalPo:""`, `roadmap:""` | `"Website"` already exists in `PLATFORMS` (`05:81`). `startPoint` stays blank: a New CAD order derives "CAD Instructions" at Create |
| customer (resolved, §4.1) | `customerId` | The id of the Customer Master entry whose `code` = the linked `customer_code` |
| `client_po` | `refPo` | **D6** |
| `end_customer_name` | (text) `cadInstructions`, as `End customer: …` | **D6**. `personalPo` is left blank for staff |
| `product_type` | `style` | Ring, Earring, Pendant, Necklace and Bracelet map directly. Locks, Charm, Cufflinks and Other become `"Other"`, and the product name goes into `cadInstructions` (D7) |
| `size_spec` | `size` | Only for Ring, Necklace and Bracelet, and only when it is digits with ≤2 decimals (`sanitizeSize`). Anything else goes into `cadInstructions` |
| `quantity` | `quantity` | Integer ≥1 |
| `finish_point` | `finishedProduct` | `file→File`, `wax→Wax`, `raw_casting→Raw Casting`, `polished_mounting→Polished Mounting`, `finished_piece→Finished Piece` |
| metals | `metals:[{metal,color}]` | `"14k Yellow Gold"` → `{metal:"14K",color:"Yellow"}`. Platinum, Silver and Palladium have no colour. Keep the Portal's `display_order`, because ERP weights are positional. Area and surface finish have no ERP field: area goes into `cadInstructions`, finish into `mfgInstructions` |
| centre stone | `center:{source, stoneType, color, clarity, colorText}` | See §6.3. **These feed pricing.** Prefill only exact matches; otherwise leave blank. A blank resolves to no rate, shown red, which is the ERP's own safe behaviour (`02_INVARIANTS.md:31-33`) |
| accent stones | `stones:{source, types:[…]}` | One source for all of them, or blank and listed. One `types` row per distinct type, colour and clarity. The Portal's accent form collects type, supply and quality only (no counts, sizes, shapes or setting styles) |
| centre shapes, mm, carats, make, certificates | (text) `cadInstructions` | **Never** into `design.settings`. Unknown shapes there are priced off the Round chart (`bugs/2026-09-21-shape-fallthrough-to-round.md`) |
| `description`, submission notes | `cadInstructions` | |
| engraving text, positions, logo | `mfgInstructions` (prints on the job card) | The ERP has no engraving field. The logo file is a later phase (§10), so a logo is listed for the AM |
| ~~`customer_requested_due_date`, priority rush~~ | — | **Not collected.** The Portal's order form has neither field (2026-10-19). The rows stay here for when it does: due date → text, rush → a `rush` request (§9) |
| ship-to / drop-ship address, shipping method | `shipTo:{method, recipient, line1, line2, city, state, postal, country, phone}` | **D5**. A new optional key; the ERP had no per-order address, only the customer's own. `method` is the Portal's `drop_ship` or `different_address`; `null` when the customer ships to their own address (`standard`). Create keeps it on the order only when it names somewhere else |
| reference images | `images:[]` | Later phase: the gateway copies files into the bucket `order-images` under `intake_portal_<uuid>/ref_…` |

**`cadInstructions` gets one fixed, readable block,** so the AM sees everything the customer said:

```
[Portal order · submitted 2026-10-19 by Jane Smith (jane@example.com)]
End customer: Lauren M.
Product: Cufflinks
Metals: band — 14k White Gold, high polish · head — 18k Yellow Gold, matte
Centre: Natural Diamond, Oval, 7 × 5 mm, 1.00–1.20 ct, colour F–G, clarity VS1–VS2, cert GIA, Dia-Co supplies
Accents: Lab-Grown Diamond, E/F VVS, Dia-Co supplies
Description: …
Notes: …
```

`mfgInstructions` gets the engraving (`Engraving (inside shank top): "…"`, or the logo) and the metal finish.

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

**D7 (decided 2026-10-19): map now, trim the form later.** Intake applies the "blank plus note" rules
above. Trimming the Portal form to the ERP's vocabulary, for anything that feeds price, is a follow-up.

---

## 7. Status the customer sees

**Built in Step 2 (2026-10-16), per the owner's D2, D4 and D11.**

`_portal_status(status, workflow, cad_status, mfg_status, party)` is SQL in the ERP
(`db/2026-10-16-portal-orders-read.sql`). It reads **only** the mirror columns. It translates into
**the Portal's own** `order_status` + `sub_status`, so the existing `StageRibbon` (Designing → Production →
QC → Shipping) and status pills render ERP orders unchanged.

| ERP state | Portal `status` · `sub_status` | The Portal shows |
|---|---|---|
| `status='cancelled'` | `cancelled` | the Cancelled tab |
| CAD: New Order Request, CAD Assigning, CAD Designing, Admin Review, CAD Error | `designing` · `awaiting_design` | A Designing — "Design in progress" |
| CAD: Client Review | `designing` · `awaiting_review` | A Designing — "Needs review" pill |
| CAD: Mod Requested, Redesigning | `designing` · `redesigning` | A Designing — "Redesigning" pill |
| CAD: Approved; Manufacturing: Approval | `approved` | B Production — "Queued for production" |
| Manufacturing: every other step, and the QC checks before the last | `in_production` | B Production |
| Final QC (as `isFinalQC()` decides it) | `qc` | C QC |
| Freeze, Follow-Up | `on_hold` | "On hold" pill |
| `workflow='Invoicing'` | `shipping` | D Shipping — "preparing to ship" |
| `workflow='Done'` (invoiced) | `shipping` + `shipped: true` + `shipped_on` = invoice day | D Shipping — "Shipped" (**D4**) |

**The ship date** is `ship_date` + 2 business days (A3). Saturday and Sunday are skipped exactly as
`addBusinessDays` skips them. Every date is read as the Pacific day.

**Which orders a customer sees (D11):** every non-draft order with the customer's code that is still open,
or was ordered, shipped or cancelled in the last 12 months. Imported Orderwise orders count from their
`orderDate`, not the import day.

**What keeps it from drifting** (`portal.test.js` E-section, trip-proven):
- The VALUES lists must name exactly the app's `CAD_STATUS`, `MFG_STATUSES`, `SIDE_STATUSES`,
  `REJECTED` and `READY_INVOICING`, plus three legacy values. A status added or renamed in the app fails
  the gate until it is mapped. **Add this file to the status-rename sweep** next to `isFinalQC`.
- The Final QC rule matches `isFinalQC()`.
- The ship date matches `addBusinessDays`.
- The allowlist is pinned key by key.
- Mirror fields are read from columns.

---

## 8. Design review and quote: `order.design`

**Built in Step 4a (2026-10-20)** as below. The snapshot lives in its own key, `data.portalReviews`, not `data.portal.review` as first proposed, because `data.portal` is Step 3's receipt and the ERP's "From the Portal" banner shows whenever it exists.

- **One snapshot per showing.** When an AM presses **Send to Client Review**, the ERP app appends `portalReviewOf(o)` (part 30) to `data.portalReviews` in the same save as the move. Every version sent stays, so the customer can look back at v1 after v2 (owner ruling). Undo in Transactions removes the one that send added.
  ```
  { v: versionLabelOf(o), at, renders: [storage paths of this order only], model_url,
    quote: { lines: [{dept, process, pc, wt, rate, qty, amount, rjo, added}], total, caution, caution_note, disclaimer } | null }
  ```
- **Renders follow `publishedRendersOf()`**, so the "which design is current" rule keeps its single home. The model link is the one the AM sees on the card (the live link, else the newest round that wasn't errored), normalised.
- **The quote is the saved quote, as the printed quote reads it** (owner ruling: line for line):
  - Each cell (pc, wt, rate, qty) is the paper's own text, from `priceCellsOf`, which `PriceDoc` now prints through.
  - The rate is blank when the amount was overridden. RJO and ADDED lines are kept.
  - The caution comes from `unpricedStonesOf`, the editor's own rule. The caution and the disclaimer are the paper's sentences (`QUOTE_STONE_CAUTION`, `QUOTE_DISCLAIMER`).
  - Amounts are dollars with 2 decimals. The Portal displays them and never recomputes them.
  - No saved quote, or a stale one: `quote: null`, and the Portal says the quote will come from the account manager.
- **The read** (`portal_order_design`) rebuilds each snapshot key by key (`_portal_review_json`). Only this order's render paths, an http(s) model link and the nine line fields can leave. The order must be one `portal_order_get` would show.
- **Renders.** The gateway signs the paths from the private bucket `order-images` for 7,200 s, the app's `SIGNED_TTL`, and returns links, never paths. If signing fails it returns `renders_unavailable: true`, and the Portal says the images could not load.
- **Never included:** `rarUrl`, designer, settings internals and quote inputs.
- **This changes how AMs work.** Today an AM shares renders outside the app; the Portal becomes that channel. For a customer with a Portal login, the ERP's Send bar says what they will see.
- **Before go-live:** orders already at Client Review have no snapshot until sent again. A one-time fill from each order's current renders and saved quote is planned (owner ruling), and not built.

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
   - **Send to Client Review:** append to `data.portalReviews` (§8). Built in Step 4a.
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
| D1 | Build intake before the schema rebuild? | **DECIDED 2026-10-19 (owner): yes.** Intake is built now, on today's draft rows (§12) |
| D2 | Customer stage list: include Finishing? Short or full path per order? | **DECIDED 2026-10-16 (owner): the stages the Portal already shows.** That is the `StageRibbon`: Designing → Production → QC → Shipping, or Designing → Wax production → Shipping for file and wax orders, plus the Designing sub-states and the existing status pills. The ERP maps its statuses into the Portal's `order_status` + `sub_status` (§7) |
| D3 | Who handles portal drafts? | **DECIDED 2026-10-19 (owner): a shared Portal Review panel** on New Order that every AM and Admin sees, not one AM's private drafts |
| D4 | Is "Shipped" the same as invoiced (`Done`)? | **DECIDED 2026-10-16 (owner): yes.** `workflow = 'Done'` is shown as shipped. Revisit if a real ship event is added |
| D5 | Drop-ship address and shipping method on ERP orders? | **DECIDED 2026-10-19 (owner): a new optional `data.shipTo`** (recipient, address, phone, method). The AM sees it on the draft, and Create carries it onto the order. Printing it on the job card and invoice is a follow-up |
| D6 | `refPo` vs `personalPo`: what does each mean? | **DECIDED 2026-10-19 (owner): the Portal's Client's PO → `refPo`; the end customer's name → `cadInstructions` text.** `personalPo` stays for staff. Why: `refPo` is the PO that ERP search, lists, prints, AR statements and the SDR export use, and Step 2 already shows it back to the customer as their PO. The code's only note on `personalPo` is "the number the customer's own staff match against" (`74:114`) |
| D7 | Vocabulary gaps (D/E colour, mixed supply, Locks/Charm/Cufflinks, Trapezoid/Cadillac, five setting styles, colour stones) | **DECIDED 2026-10-19 (owner): map now, trim the form later.** Exact matches pre-fill; anything else is left blank and noted for the AM (§6.3). Trimming the Portal form to the ERP's lists is a follow-up |
| D8 | Auto-link Sales Reps invited by a linked Customer Admin? | Yes, logged |
| D9 | Portal shows Restore after a cancel (A4)? | Yes: the status follows the ERP |
| D10 | Which Portal test logins survive the customer reset? | (plan §4, open) |
| D11 | Show imported Orderwise (`DG-`) orders to customers? From what date? | **DECIDED 2026-10-16 (owner): yes.** Every order still open, plus every order created or finished in the last 12 months |
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
