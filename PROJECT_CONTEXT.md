# Diaco Portal — Project Context

**Last updated:** October 20, 2026 (ERP integration Step 4a, design review, built but not yet applied; Steps 1a, 1b, 2 and 3 on ERP staging)
**Maintained by:** Claude, at Arpit's direction. Replaced after each work session.
**Status:**
- **Done:** Phase 2C Sub-sessions 1-4 are live in prod (https://diaco-portal.vercel.app). Sub-session 5 (Customer Admin `/team` + invitations) is built in code, and its migrations are applied to the portal database (verified 2026-10-15: `/team` loads members and pending invitations). Whether SS5 is deployed to prod is unverified.
- **Repo:** this working copy is a fresh repo (`rathichandar/diaco-portal`, one import commit). The earlier history, including `9e029ba`, lives in the original repo.
- **ERP integration** (`ERP_INTEGRATION_CONTRACT.md` §0 has the detail):
  - **Steps 1–2 work on ERP staging:** identity links and invites, and a linked customer's orders read from the ERP.
  - **Step 3 works end to end on staging (2026-10-19).** Orders are sent to the ERP, where AMs see a shared Portal orders panel and Create or Decline each one. A browser run verified both paths, and AB-1310 is the test order.
  - **Step 1b works end to end on staging (2026-10-20).** ERP staff can see a customer's Portal logins on Customer Master, invite a Customer Admin, send an invitation again, and revoke. A browser run did all three through a tunnel to the Portal. It's ERP code only; the Portal side came with Step 1a.
  - **Step 4a (design review) is built (2026-10-20), not yet applied or deployed.** When an AM sends a design to Client Review, the customer sees it on the order page: the renders, the 3D model, earlier versions, and the quote as the printed quote reads it. Switching it on needs the new ERP SQL, a `portal-gateway` redeploy and the new ERP build.
- **Next:** switch on and test Step 4a, then Step 4b (customer requests: approve, request changes, cancel, rush).

> **⚠ DIRECTION CHANGE: read before planning anything.** The "internal software" this doc and
> `EXISTING_SYSTEMS_REFERENCE.md` describe (locally hosted, old dev team) was **replaced on
> 2026-08-08** by **Dia-Co Internal**, a cloud ERP on its own Supabase projects. It is now the system of
> record for orders, customers, messaging and AR. The Portal is its customer-facing window.
>
> - **The authoritative plan** is in the ERP repo:
>   `files/diaco-internal-context/reference/PLAN_Internal_Portal_Integration.md` (16 Aug 2026). The ERP repo
>   is at `C:\Users\Chandar\Desktop\Dia-Co-portal\Dia-Co-Portal`.
> - **The concrete contract** is `ERP_INTEGRATION_CONTRACT.md` in this repo. It covers operations, field and status mappings,
>   security, the work list, and open decisions D1–D12.
> - **What the change invalidates here:**
>   - Phase 2D "sync via the old dev team's endpoints".
>   - "AR/payments STANDALONE": the ERP owns the ledger.
>   - Sub-session 6's `/admin` approval queue, which moves into the ERP.
>   - Portal `customers` as a business entity: it becomes a login shell keyed by `customer_code`.
>   - Phase 3.x "migrate internal workflows into the Portal": the ERP already does them.
> - **Still valid:** the 6-role model, capability flags, RLS, and the auth foundation (SS1–SS5).

**Companion doc:** `EXISTING_SYSTEMS_REFERENCE.md` describes the OLD portal and the OLD internal software (Orderwise era). It is history now, so read the banner at its top. For the current system, read `ERP_INTEGRATION_CONTRACT.md`.


**Companion doc (NOT auto-loaded):** `PROJECT_HISTORY.md` — contains backlog (§20), lessons (§21), and session log (§23). Reference explicitly when needed; not loaded by default into Claude Code context.

---

## 1. Who and what

**Owner:** Arpit Bhanderi. Sole owner of the business. GitHub: `diaco-arpit`. Business email: `Arpit@diacoglobal.com`.

**Business:** Dia-Co (note: hyphenated, NOT "Diaco") — B2B custom jewelry manufacturer. Customers are retail jewelers (~350 of them, ~65% actively using portal, growing). Volume: ~150 projects/week, ~100 CAD files/day. Custom jewelry orders, meaningful $ per piece.

### Terminology (LOCKED Session 14 — 6 roles, do not change without re-discussion)

**Customer-side roles (3):**

- **Sales Rep** — Customer/retailer side. The person at a jewelry retailer who places orders. Hardcoded user in `src/lib/orders/hardcodedUser.ts` is a Sales Rep. ~350+ exist across all customers.
- **Customer Admin** — Customer/retailer side. ALL Sales Rep permissions + manages Sales Reps within their company + payment abilities + invoice/AR visibility. Multiple Customer Admins per company allowed (for redundancy). Approved by Super Admin during onboarding.
- **Accounting** — Customer/retailer side. ONLY invoices/AR/payments visibility. NO order placement. NO general order history. Scoped view of orders only insofar as they appear on invoices. **Placeholder for first ship — does NOT have build work in Phase 2C** (no AR features ship until first ship's AR view goes live). Enum value reserved in 2C.

**Dia-Co side roles (3):**

- **AM (Account Manager)** — Dia-Co employee. Assigned to specific customers. Reviews orders, talks to internal CAD team, sends quotes, manages production handoffs. AMs do NOT approve registrations and do NOT place orders themselves.
- **AR** — Dia-Co accounts receivable employee. Single person for now (might hire more later — see Q below). In first ship: log in to new portal, see what customers paid through the portal, participate in customer messaging threads. NOT applying payments / managing bank deposits / generating statements in first ship — those stay in internal software.
- **Super Admin** — Currently just Arpit. Approves Customer Admin registrations + creates AM, AR accounts. Full visibility across all customers, all internal users, all orders.

**Other internal roles NOT in the portal (for clarity):**

- **CAD designer** — Dia-Co Mumbai-side. Builds 3D CAD renders. INTERNAL ONLY — names NEVER shown to Sales Reps in portal. Workflow stays in internal software (Option A locked Session 14 — deferred until Phase 3.0+).
- **CAD manager** — Same.
- **Production team** — Printing, casting, cleaning, setting, polishing, engraving. Stay in internal software for first ship + most of Phase 3.
- **AP person** — Bills, vendor payments, profit tracking. Stays in internal software indefinitely.
- **Workshop manager** — Jeweler assignments + complexity ratings. Currently uses internal software + physical job bags + Google Sheet for efficiency. Stays in internal software for now.
- **QC team** — Job card-based checklist work. Stays in internal software for now.

**Common Claude mistake to avoid:** mixing up "AM" and "Sales Rep". The portal is currently customer-facing only, so all current portal users are Sales Reps. AMs join the portal in Phase 2D.

### Team structure

- LA office: Arpit + AMs + production team + AR + AP + workshop manager + QC
- Mumbai office: CAD designers
- Independent contractors: setters (paid per stone/style)

### Existing systems (high-level — see EXISTING_SYSTEMS_REFERENCE.md for details)

Dia-Co runs on TWO existing codebases:

1. **Existing customer-facing web portal** (ASP.NET Core 9 / C# / SQL Server / AWS S3) — being replaced by the new Dia-Co Portal. Retires at first ship.
2. **Existing internal order management software** — LOCALLY HOSTED in LA office. Runs ~90% of Dia-Co's business. Will coexist with the new portal for years. Migration of its workflows to the new portal happens incrementally in Phase 3+.

Some sync between the two existing systems already works (DG number, status, CAD renders, invoices, ship dates, stock designs, mod requests, approvals). Other things don't sync at all today (payments, balances, messaging, engraving details). See `EXISTING_SYSTEMS_REFERENCE.md` §2 for full sync inventory.

---

## 2. The current workflow

[Preserved from prior sessions. Now codified in detail in `EXISTING_SYSTEMS_REFERENCE.md`. Refer to that doc for end-to-end workflow understanding.]

Key high-level points for context:
- ~50% of orders come through the portal, ~50% come via text/email/shipment (AM enters into internal software, optionally "Send to Web")
- Every customer is HYBRID — even portal-active customers occasionally have AM-entered orders
- Some orders are internal-only (never sent to portal even though customer has portal account)
- AMs are the central spider in the web; touch every order multiple times across its lifecycle

---

## 3. The plan and approach

> **Superseded in part (2026-10-15).** The phase plan below was written before Dia-Co Internal replaced
> the old internal software.
> - **Still the plan:** Phase 2C (auth + roles).
> - **Replaced:** Phase 2D/2E and Phase 3.x, by the ERP integration sequence in
>   `ERP_INTEGRATION_CONTRACT.md` §12. In order:
>   1. gateway + identity links
>   2. read path
>   3. order intake
>   4. design review + requests
>   5. messaging → AR read-only → payments
>
> The section is kept for history.

### Strategic reframe (Session 14 — replaces prior phase plan)

**The new portal is eventually the ENTIRE Dia-Co operating system.** Not just a customer portal replacement. This is a multi-year migration project, but Arpit wants the first ship (customer-facing + AM-facing + standalone AR/payment) within ~3-4 months at his 20 hrs/week commitment.

**Mental model:**

- **First Ship** (Phase 2C → 2D → 2E together): Replaces old customer portal + adds AM workflow + adds standalone AR/payment for customers.
- **Phase 3+:** Migrates internal software's workflows onto the new portal one at a time (CAD, accounting, pricing, production, QC). Multi-year runway. Eventually internal software retires.

### Phase plan (LOCKED Session 14)

| Phase | Goal | Status |
|---|---|---|
| Phase 1 | Order detail page (view-only) | ✅ Shipped Session 6 |
| Phase 2A | Schema + foundation (21 tables, 14 migrations, RLS scaffolding) | ✅ Shipped Sessions 7-11 |
| Phase 2B | Order entry flow (9 sections + Submit + Drafts + resume) | ✅ Shipped Session 13 |
| **Phase 2C** | **Auth + 6-role data model + RLS redesign + login/registration** | SS1–5 built (SS5 E2E test pending); SS6 dropped (queue moves to ERP) |
| Phase 2D | AM portal + initial sync with internal software | **Superseded**: see `ERP_INTEGRATION_CONTRACT.md` §12 |
| Phase 2E | Customer actions + messaging + AR view + payment portal + AR/AM portal access | **Superseded**: see `ERP_INTEGRATION_CONTRACT.md` §12 |
| **🎯 FIRST SHIP** | **Phases 2C + 2D + 2E shipped together — replaces old portal, adds AM + AR portals, standalone payment** | **~3-4 months out** |
| Phase 3.0 | CAD designer + stock designs migration to new portal | After first ship |
| Phase 3.1 | Automated pricing engine | After 3.0 |
| Phase 3.2 | Accounting full migration (invoice creation, AR employee workflow, statements) | After 3.1 |
| Phase 3.3 | Production + QC + job cards migration | After 3.2 (largest phase) |
| Phase 3.4 | AP migration (long-term, possibly never if production stays in internal software) | Last |

Each phase has an independent milestone. Phase 2B was deliberately scoped to be customer-functional without auth so order entry UX could be designed and tested in isolation.

### First Ship scope detail (locked Session 14)

**Phase 2C — Auth + role model foundation (LOCKED next)**

- Supabase Auth setup (email/password, session handling)
- 6-role enum in DB: `sales_rep | customer_admin | accounting | am | ar | super_admin`
- Capability flags pattern (LOCKED Option 2 from §16 below):
  - `can_place_orders`, `can_view_all_company_orders`, `can_manage_team`, `can_view_invoices`, `can_make_payments`
- Defaults per role (see §16)
- RLS redesign across every existing table (orders, order_metals, order_center_stones, order_accent_stones)
- Swap all `save*` actions + `submitOrder` + `discardDrafts` from service-role to cookie-bound clients
- Remove hardcoded user identity (`src/lib/orders/hardcodedUser.ts`)
- Login + logout + forgot password + reset password
- **Two registration paths:** self-register + Super Admin approval queue AND Super Admin/AM-initiated invite
- Customer Admin "Manage my team" UI (invite/deactivate Sales Reps, set capability flag overrides)
- Super Admin "Manage Dia-Co staff" UI (create AM, AR accounts)
- Tokenized invitation links with N-day expiry
- Transactional email infrastructure (Resend default)
- Super Admin `/admin` route — Customer Admin approval queue + AM/AR creation form
- Permissions middleware for role-based route access

**Phase 2D — AM portal + initial sync**

- AM authentication using Phase 2C's model
- AM dashboard listing assigned customers
- AM view of a customer's order list (variant of `/orders` filtered to one customer)
- AM view of an individual order (extends Phase 1 detail page with AM-side controls + visibility)
- AM-Customer assignment management (Super Admin links AMs to customers)
- AM access to order history, engraving details, customer-AM messages (the explicit "data the existing software doesn't track well" use case)
- Internal-only fields visible only to AMs (CAD designer name, internal notes)
- **First real sync work:** customer master sync (from existing dev team's existing endpoints — see §15) and order data sync. Use existing endpoints; don't depend on new ones.

**Phase 2E — Customer actions + AR/payment + messaging**

- Approve CAD action (status `designing` → `approved`)
- Request modifications action (feedback to AM)
- Cancel order action with business rules
- Priority Rush eligibility request flow
- Real-time customer-AM messaging on `order_messages` table (Supabase Realtime)
- **Customer-level message thread** (new — one per customer, all Dia-Co + customer side users on that account can participate)
- **Order-level message threads** (one per order, AM + Customer Admin/Sales Rep on that order)
- AM-entered quote display (line items + total, AM enters in portal, customer sees on detail page, "Approve CAD" implicitly approves quote — NOT the full automated pricing engine, that's 3.1)
- **AR view for customers** — account summary, outstanding balance, overdue balance, invoice list with statuses, payment history
- **Payment portal** — Stripe/ACH integration, customers pay invoices in-portal, payments auto-apply to specific invoices the customer selected
- **AR employee login** — log in to new portal, see all customers' portal-native payment data, participate in customer-level message threads, see context in order-level threads. AR does NOT apply payments (auto-applied at customer pay time), does NOT do bank deposits / statements (stays in internal software).
- **CRITICAL CONSTRAINT:** AR/payment data is STANDALONE in the new portal — does NOT sync with internal software in first ship. External payments (check, wire, in-person via AR person in internal software) DO NOT appear in the new portal. Customers will see different balances in the new portal vs. reality if they pay externally. We tell them this directly. Long-term, request the existing dev team to build a payment-sync API (don't block first ship on this).

### Phase 3.0 — CAD designer migration (post-first-ship)

- Designer queue + assignment workflow on new portal
- Point value assignments by CAD manager
- File upload (3dm, stl, renders) to cloud storage — Cloudflare R2 for large files (zero egress, India region speed), Supabase Storage for small renders/thumbnails
- Designer efficiency reporting
- Stock design flow (with live pricing — but pricing master still in internal software, syncs to portal for display)
- Note: Mumbai upload speed is a real pain point today (firewall to LA server). Cloud storage in an India region would be FASTER than current setup, not slower. Real productivity gain.

### Phase 3.1 — Automated pricing engine

Replaces AM-entered manual quotes with calculated quotes. Metal weight × spot price, stone costs by shape/size/color/clarity, labor formulas by setting style, finishing, margin. Real-time updates as CAD changes. Significant build — likely the largest single phase after first ship.

### Phase 3.2 — Accounting full migration

Invoice creation moves from internal software to new portal. AR employee workflow (call notes, payment application for external payments, bank deposits, statements, discounts, returns) moves to new portal. Customer statements. Reporting on AR side moves to new portal. Once this ships, the internal software's AR module can retire.

### Phase 3.3 — Production + QC + job cards migration

The biggest phase. Production status changes, barcode-scan in/out for jewelers, job card printing, QC checklists, workshop efficiency tracking. Probably also includes workshop manager assigning jobs in the portal (vs. physical job bags). Internet redundancy is a real consideration here — production cannot stop if office internet drops.

### Phase 3.4 — AP migration

Long-term, possibly never. Bills, vendor payments, per-order profit tracking. May stay in internal software indefinitely.

---

## 4. Tech stack (LOCKED + installed + deployed)

- Next.js 16.2.6 + TypeScript (Turbopack)
- PostgreSQL via Supabase ✅ LIVE
- Tailwind CSS + scoped `.diaco-design` CSS
- Playfair Display / IBM Plex Sans / IBM Plex Mono via next/font
- lucide-react
- Vercel — `https://diaco-portal.vercel.app`
- Claude Code (Opus 4.7, xhigh effort) — Mode B
- Supabase: `Dia-Co Portal`, us-west-1, URL `https://rnwslatnbcrasjambabt.supabase.co`

**Future tech (Phase 2E+):**
- Resend (or similar) for transactional email — Phase 2C
- Stripe + ACH integration — Phase 2E payment portal
- Cloudflare R2 for large file storage — Phase 3.0 CAD designer files

---

## 5. Integration architecture (replaced 2026-10-15)

The old locks are dead: "build off the existing dev team's endpoints", "AR/payment STANDALONE", and the
endpoint audit. The integration is now with **Dia-Co Internal (the ERP)**, and the full design is
`ERP_INTEGRATION_CONTRACT.md`. In short:

- **The ERP is the system of record.** The Portal displays ERP data and submits into it. Neither writes the
  other's tables, and no customer signs in to an ERP project.
- **Portal server → ERP Edge Function `portal-gateway`.** Each call is signed with a shared secret and carries the
  customer's own Portal access token, which the ERP verifies. The ERP resolves the Portal user to an ERP
  `customer_code` (`portal_links`), then calls one service-role-only `portal_*` RPC.
- **ERP staff → Portal.** The ERP Edge Function `portal-admin` calls signed, POST-only Route Handlers under
  `/api/erp/*`, starting with invites.
- **Status wording, the customer stage list and the customer ship date** (internal + 2 business days) are
  computed in the ERP. The Portal holds no copy of those rules.
- **Customer actions are requests an AM acts on.** Approve, modify, cancel and rush never change order state
  directly.
- **Portal orders arrive in the ERP as pre-filled drafts** in a Portal Review panel. An AM creates the real
  order with the ERP's existing Create flow.
- **Nothing is built yet on either side.** Open decisions D1–D12 are in the contract's §13.

---

## 6. Data source taxonomy

Custom orders use `productType`: ring, pendant, earring, bracelet, necklace, locks, charm, cufflinks, other.

---

## 7. Working agreement: position model

Position 3. Arpit makes decisions, Claude executes in batches. Pre-step conversation pattern locks decisions before any prompt is written. Session 14 added a new wrinkle:

**For high-stakes strategic decisions (Session 14-type):** The pre-step conversation gets longer and may go through multiple rounds of clarifying questions before any decision is locked. The pre-step is the architecture work; the prompt-write is mechanical.

---

## 8. Working agreements

**Claude's commitments (key reminders):**
- Pre-step conversation before every green-light
- Verification SELECT cadence after every step
- Grants check on every SECURITY DEFINER function (REVOKE PUBLIC baked into same migration)
- Prompts are clean blocks, side observations clearly labeled
- Demand actual SQL before approving migrations, not just design notes
- Always use master row names verbatim in spec docs — don't shorten proper nouns
- **Verify migration files before claiming a column doesn't exist**
- **Use Sales Rep / Customer Admin / Accounting / AM / AR / Super Admin terminology verbatim** — do NOT say "AM" when meaning Sales Rep
- **Read EXISTING_SYSTEMS_REFERENCE.md alongside this doc** when planning anything that touches sync, AM workflow, AR workflow, or internal-system territory

**Session 14 efficiency adjustments (LOCKED — see backlog for full discussion):**

Free speedups now active:
- Bulk-approve narrow exact-form whitelists for safe file edits inside `src/`, `npm run *`, read-only git/gh, read-only psql. Still STRICT on `supabase db *`, git commit/push, anything destructive.
- Parallelize the two Claudes — while Claude Code implements Step N, this chat designs Step N+1.
- Don't re-derive locked decisions — cite the doc and move on.

Conditional speedups (case by case):
- Pre-step length scales with stakes (narrow steps = shorter pre-step, high-stakes steps = full pre-step)
- Verification cadence scales with risk (migrations + RPCs + RLS = full verification, UI tweak = build + smoke)

Quality non-negotiables held:
- Don't loosen RLS testing in Phase 2C
- Don't skip pre-step on Phase 3.1 pricing
- Don't auto-approve commits or `supabase db *`

**Working hours commitment (Session 14):** Arpit committed to **~20 hours/week sustained**. First ship timeline estimated at ~3-4 months at this pace.

---

## 9. Execution mode

**Mode B (LOCKED Session 7):** Claude Code locally at `~/diaco-portal`. Two Claudes in parallel — this chat plans, Claude Code executes.

**Approval pattern (refined Session 14):**
- **Option 2 (bulk-approve) acceptable for:** narrow exact-form whitelists with all flags + args visible. E.g., `curl -sf -o /dev/null http://localhost:3000/orders/new` (the literal string). Also file writes in `src/` under ~200 lines, `npm run *`, read-only git/gh, read-only psql.
- **Option 1 (per-action) STILL REQUIRED for:** DB-related (`supabase db *` includes `db reset`), git commits and pushes, file writes for major changes, `npx tsx scripts/*`, anything new or unfamiliar, ANY category wildcard.
- **Mental rule:** read what option 2 would auto-approve clause by clause. Real constraints = paths, exact binaries, exact flags. Category wildcards = "similar," "like this," bare `*` → NEVER.

**Pre-step conversation pattern:** Decisions locked before prompt is written. Prompt is a clean block. Refinements only after step ships.

**Verification cadence:** Read-only SELECT in every ship message. Migrations get verification queries: column/function metadata AND grants. **For RPC grant verification: use the functional curl trio (service-role POST → 204, anon POST → 401, publishable POST → 401 with code 42501). Catalog SELECTs against `pg_catalog` and `information_schema` are NOT executable via PostgREST from Claude Code.**

---

## 10. Phase 1 — final state (SHIPPED Session 6)

Live URL: https://diaco-portal.vercel.app/orders/DG-10001. Customer-facing labels and rules preserved from prior context.

---

## 11. Visual system (LOCKED across Sessions 9-13)

Color palette: `#F5F5F5` page bg / `#FFFFFF` cards / cream accent / `#8B7355` primary brown / `#C1403D` red (sparingly) / `#D4A94A` gold (warning indicators).

Typography: Playfair Display (display), IBM Plex Sans (body), IBM Plex Mono (identifiers/numerics).

**Warning icon placement (LOCKED Session 13 sub-session 3):** Right-side cluster on section headers, between the value summary and the chevron. Always render the icon column (use `visibility: hidden` not `display: none` when no warning) so section title positions stay invariant across warning states. Gold AlertTriangle from lucide-react.

---

## 12. Priority Rush feature (LOCKED Phase 1)

[Unchanged. Implementation lands in Phase 2E.]

---

## 13. Database schema — LIVE on Supabase

**Schema:** 21 tables (16 operational + 5 master). Full details in `SCHEMA.md` (in repo).

**Migration files (55 total, through ERP integration Step 3).** SS5's files (47–53) are confirmed applied by `/team` working against the portal DB on 2026-10-15; earlier files were applied per their sessions.

- 54: ERP Step 1, `20261015000001_erp_invites_and_customer_shells.sql`. Applied 2026-10-16.
- 55: ERP Step 3, `20261019000001_erp_order_intake.sql`: `orders.erp_*` columns, `record_erp_submission`, `reopen_declined_order`. Applied 2026-10-19.

- 47-53: Sub-session 5. `20260719000001`–`07`:
  - `pending_invites` table (role + capability-flag snapshot, 7-day `expires_at`, status pending/accepted/revoked/expired)
  - RLS (Customer Admin with `can_manage_team` on own customer; Super Admin ALL) + immutability trigger
  - `first_name` / `last_name`
  - `revoke_pending_invite(uuid)` (INVOKER, atomic FOR UPDATE)
  - capability-defaults trigger changed to COALESCE-fill (an explicit flag from the invite survives)
  - pending invite emails globally unique
  - `finalize_pending_invite()` (DEFINER, derives everything from `auth.uid()`)

**Earlier migrations (through Sub-session 4):**
- 01-08: Initial schema, enums, master data, triggers (Session 7)
- 09: Phase A schema additions (Session 8)
- 10-14: RLS, GRANTs, dev-mode policies (Session 8 — REPLACED by Sub-session 3 migrations 9-12)
- 15: `actual_ship_date` column (Session 9)
- 16: Order Entry schema prep — includes `order_metals.finish` column (Session 11)
- 17: `product_type_id` NOT NULL relaxation (Session 11)
- 18: Engraving position split (Session 12)
- 19: `save_order_metals` RPC (Session 12)
- 20: REVOKE PUBLIC EXECUTE on save_order_metals (Session 12)
- 21-26: Center stones range columns, mm dimensions, certification as text[], RPC iterations (Session 13)
- 27: `quality_color` + `quality_clarity` columns on order_accent_stones (Session 13)
- 28: save_order_accent_stones v2 — accepts quality fields (Session 13)
- 29-33: Sub-session 1 — auth foundation (`app_role` enum, `user_profiles` table + trigger, 6 auth helpers, seed Arpit + Heritage CA)
- 34-36: Sub-session 3 schema additions (`orders.started_by_user_id` + `'submitted'` enum value, `order_owners` join table, `user_profiles.can_manage_order_owners` flag + trigger update)
- 37-39: Sub-session 3 RLS migrations (drop dev policies + master-table policies, core policies on customers/users/user_profiles/order_owners/orders/order_*_stones with immutability triggers + `current_user_can_update_order` helper, order-graph extras: cad_versions + 5 cad_* + attachments + messages + history)
- 40: Sub-session 3 recursion fix — `current_user_owns_order` + `get_order_customer_id` SECURITY DEFINER helpers, rewire orders + order_owners SELECT policies (caught at functional matrix runtime; orders SELECT ↔ order_owners SELECT inline EXISTS formed cycle Postgres rejects with 42P17)
- 41-46: Sub-session 4 — Marcus user_profiles seed, `assert_can_modify_order` helper, `create_order_draft` + `submit_order` RPCs, save_order_* RPCs grow assert+grant authenticated, public.users seed for Arpit + Arbhanderi (caught during local smoke — Sub-session 1 missed seeding these)

**No longer coming here (2026-10-15):**
- `customer_registrations`: the registration queue lives in the ERP.
- `customer_internal_notes`: customer notes live in the ERP.

`pending_invites` shipped in SS5.

**Shipped in Phase 2C — chronicle of all 4 sub-sessions:**

- **Sub-session 1** (commit `5166da7`, DB-only): `app_role` enum (6 values: sales_rep / customer_admin / accounting / am / ar / super_admin), `user_profiles` table linking auth.users → role + customer_id + 5 capability flags with CHECK constraint, BEFORE INSERT defaults trigger, 6 SECURITY DEFINER auth helpers (`current_user_role`, `current_user_customer_id`, `is_super_admin`, `is_diaco_staff`, `is_customer_side`, `current_user_has_capability`), seed Arpit (super_admin, `c0fdeac0-...`) and Heritage CA (Arbhanderi, `98b362cb-...`).

- **Sub-session 2** (commit `c337be7`, UI ship): /login + /logout + /forgot-password + /reset-password + /auth/callback (PKCE code-exchange handler). Next.js 16 proxy at `src/proxy.ts` with public-route whitelist + redirectTo open-redirect sanitization. Auth pages styled per §11. PasswordInput show/hide component. Authenticated route group `(authenticated)/` with shared layout fetching user email; TopNav extended with user+logout cluster. **REORDER NOTE:** original §16 plan had Sub-session 2 = RLS. Audit during Sub-session 1's tail found existing fetch paths use cookie-bound clients, which would break under real RLS with no login UI in place. Login UI moved to Sub-session 2, RLS moved to Sub-session 3.

- **Sub-session 3** (commit `3d72193`, RLS + ownership model): drop 21 dev-mode permissive policies (migrations 10-14). Add `orders.started_by_user_id`, `order_owners` join table, `user_profiles.can_manage_order_owners` 6th flag. Real per-role policies on 23 tables. Two BEFORE UPDATE immutability triggers (orders.customer_id + started_by_user_id; user_profiles.id + role/customer_id under non-super_admin). `current_user_can_update_order(uuid)` helper closes child-table defense-in-depth gap. Verified end-to-end via 10-test impersonation matrix: 25/25 assertions pass. Migration 40 fixed an `orders ↔ order_owners` policy recursion caught at functional matrix runtime (Postgres SQLSTATE 42P17) — two new SECURITY DEFINER helpers (`current_user_owns_order`, `get_order_customer_id`) break the cycle.

- **Sub-session 4** (commits `1241802` action layer swap + `aa47bc8` revalidate + `c76fef0` secure:true + `52e690b` cookie-copy + `9e029ba` logout-prefetch fix): every customer-facing write path swapped from service-role to cookie-bound client. New `create_order_draft(p_payload jsonb)` + `submit_order(p_order_id uuid)` RPCs. Existing 3 save_order_* RPCs grow `assert_can_modify_order` at first line + GRANT authenticated. `hardcodedUser.ts` DELETED; identity now derived from `auth.uid()` server-side. 10 files refactored. Phase F local smoke uncovered 2 bugs: Migration 18 (Arpit + Arbhanderi missing public.users rows — Sub-session 1 only seeded them into auth.users + user_profiles), and JS-side normalization in saveDraft.ts for the 3 NOT NULL DEFAULT columns (quantity, engraving_use_logo, ship_to_country) to match the RPC's INSERT-side COALESCE behavior. **Phase G prod smoke uncovered a Sub-session 2 retroactive bug** — see "Lessons" below.

**Lesson learned during Phase 2C Sub-session 4 prod testing — logout-prefetch retroactive bug:**

Sub-session 2 shipped `/logout` as a GET route handler. TopNav had `<Link href="/logout">`. Next.js Link components prefetch on hover by default. The prefetch fired the GET /logout handler as a side-effect: `supabase.auth.signOut()` queued clear-cookie writes, the browser honored them, session died. Every subsequent click bounced to /login. The bug was invisible in Sub-session 2 prod smoke because that smoke only tested single navigations; Sub-session 4's "use the actual app" testing surfaced it.

Five failed-fix attempts before root cause (each independently correct hardening, kept in place): `aa47bc8` (revalidatePath before redirect), `c76fef0` (explicit `secure: true` on cookies), `52e690b` (copy `response.cookies` onto proxy redirects). Two diagnostic-only commits (`e7e6505`, `560b94d`) added temp logging. Final fix `9e029ba` converted `/logout` from a GET route handler to a Server Action invoked via `<form action={logoutAction}>` in TopNav. Prefetches are always GET; a Server Action can only be triggered by a real POST from a form submit. Bug eliminated.

**Generalizable lesson:** any GET endpoint that performs side-effects (logout, mutations, anything with `signOut`/`signIn`/state changes) is a footgun in a Next.js app with Link components. Convention going forward: side-effecting endpoints must be POST-only (Server Actions or Route Handlers with explicit method filters). Pure-read endpoints can stay GET.

**Stone types master** — 22 rows with `category` enum (see prior Session 13 docs for full inventory)

**Stone shapes master** — 17 rows

**Supply source enum** — `customer | diaco | mixed`

**Engraving position enum** — 10 values

**Metal finish enum** — 7 values (high_polish / matte / brushed / satin / sandblast / hammered / antiqued)

**order_center_stones columns:** carat/color/clarity/make ranges + cert (text[]) + mm dimensions + custom_stone_type_name + legacy single-value columns

**order_accent_stones columns:** stone_type_id, supply_source, display_order, quality_color, quality_clarity

**RPC signatures (end of Session 13):**
- `save_order_metals(p_order_id uuid, p_rows jsonb) returns void`
- `save_order_center_stones(p_order_id uuid, p_rows jsonb) returns void` — v3, cert as text[]
- `save_order_accent_stones(p_order_id uuid, p_rows jsonb) returns void` — v2 with quality fields
- All: SECURITY DEFINER, `set search_path = public, pg_temp`, GRANT EXECUTE TO service_role, REVOKE EXECUTE FROM PUBLIC

**Note for Phase 2C:** All RPCs currently granted to `service_role`. Phase 2C swap: RPCs called from cookie-bound clients (i.e., authenticated user), which means we may need to either (a) grant EXECUTE to `authenticated` role with RLS providing scoping, or (b) keep service_role + check `current_user_customer_id()` inside the RPC body before insert. Strategy TBD in Phase 2C pre-step.

**Foreign key cascade:** `order_metals.order_id`, `order_center_stones.order_id`, `order_accent_stones.order_id` all reference `orders(id) ON DELETE CASCADE`.

---

## 14. Pages currently live

| URL | Status | Notes |
|---|---|---|
| `/` | Redirects to `/orders` | |
| `/orders` | ✅ Live | Three tabs: Active / Cancelled / Drafts. Auth-gated. |
| `/orders/[orderId]` | ✅ Live | Full detail page from Phase 1. Auth-gated. Type signature needs updating to accept `certification: string[] \| null`. |
| `/history` | ✅ Live | Auth-gated. |
| `/orders/new` | ✅ Live | All 9 sections functional. Accepts `?orderId=X` for resume. Auth-gated. customer_id resolved from auth.uid() (no more hardcoded). |
| `/login` | ✅ Live | Email/password. redirectTo round-trip sanitized against open-redirect. Success-banner on `?reset=1`. |
| `/forgot-password` | ✅ Live | Same-confirmation-regardless email enumeration protection. |
| `/reset-password` | ✅ Live | Form gated on PKCE recovery session via /auth/callback. |
| `/auth/callback` | ✅ Live | PKCE code-exchange route handler. Email links land here. |
| `/team` | ✅ Built (SS5) | Customer Admin team management. Deploy status unverified. |

**Logout is NOT a URL anymore.** It's a Server Action (`src/app/logout/actions.ts`) invoked via `<form action={logoutAction}>` from TopNav. Previously `/logout` was a GET route handler; Next.js Link prefetch was triggering its side-effect — see the logout-prefetch lesson in §13.

**Added in Sub-session 5:**
- `/team`: Customer Admin "Manage my team". You can invite a Sales Rep or Customer Admin with first and last name and per-invitee capability flags. You can resend, revoke, deactivate or reactivate members, and toggle their flags. Super Admin sees a placeholder.
- **There is no `/invite/[token]` route.** Invites reuse Supabase's invite email → `/auth/callback` → `/reset-password`. `finalizeInvite` then provisions `user_profiles` + `public.users` and redirects to `/orders`.
- **`/login` now refuses** an account with no `user_profiles` row ("Something went wrong signing in") and a deactivated account.

**Dropped:** `/admin` (Sub-session 6). The approval queue and staff accounts live in the ERP.

**Coming with the ERP integration:** `/api/erp/invite` and `/api/erp/link-revoke` (signed, POST only). See `ERP_INTEGRATION_CONTRACT.md` §11.

**The Phase 2D / 2E page lists below are superseded (2026-10-15).** AMs and AR work in the ERP, not the Portal. Customer-facing order, design, messaging and AR pages will read from the ERP gateway; see `ERP_INTEGRATION_CONTRACT.md` §5. Kept for history:

**Coming in Phase 2D:**
- `/am` — AM dashboard
- `/am/customers/[customerId]` — AM customer view
- `/am/customers/[customerId]/orders/[orderId]` — AM order detail

**Coming in Phase 2E:**
- `/account/summary` — Customer-side AR view
- `/account/invoices` — Invoice list + payment
- `/account/payments` — Payment history
- `/ar` — AR employee dashboard
- Messaging surfaces on order detail + customer-level threads

---

## 15. Phase 2B — final state (SHIPPED Session 13)

[Preserved from prior context. See prior PROJECT_CONTEXT.md and SCHEMA.md for full Phase 2B detail.]

Key components shipped:
- 9-section order entry form at `/orders/new`
- Submit + section-level warning rollup
- Drafts tab + resume hydration
- Section 06 Accent stones quality fields (Natural Diamond + Dia-Co supplies → Color + Clarity required; Lab Diamond + Dia-Co → auto E/F + VVS)
- Extractions: `submitValidation.ts`, `submitOrder.ts`, `fetchDrafts.ts`, `fetchDraftForResume.ts`, `discardDrafts.ts`, `formInitial.ts`, `relativeTime.ts`, `SubmittedBanner.tsx`, `DraftsTable.tsx`

---

## 16. Phase 2C scope detail (LOCKED Session 14)

### Role + capability flag model

**6-role enum:** `sales_rep | customer_admin | accounting | am | ar | super_admin`

**Capability flags pattern (LOCKED — Option 2 from Session 14 discussion):**

`user_profiles` table has the role enum + boolean columns:
- `can_place_orders`
- `can_view_all_company_orders` (vs. only orders they placed)
- `can_manage_team` (invite / deactivate Sales Reps within company)
- `can_view_invoices` (placeholder, used in Phase 2E for AR view + Phase 3.2)
- `can_make_payments` (placeholder, used in Phase 2E for payment portal)

Customer Admin can override flags for Sales Reps within their company. Super Admin can override for Dia-Co staff. Each role has sensible defaults — see below.

**Defaults per role (LOCKED — confirmed by Arpit):**

| Capability | Sales Rep | Customer Admin | Accounting | AM | AR | Super Admin |
|---|---|---|---|---|---|---|
| can_place_orders | ✓ | ✓ | — | — | — | ✓ |
| can_view_all_company_orders | ✓ | ✓ | — | (assigned customers) | — | ✓ (all) |
| can_manage_team | — | ✓ | — | — | — | ✓ |
| can_view_invoices | — | ✓ | ✓ | — | ✓ | ✓ |
| can_make_payments | — | ✓ | ✓ | — | — | ✓ |

### Registration flow (LOCKED)

**Two paths, both supported:**

1. **Self-register (new customers):** Brand new retailer visits `/register`, fills out company + first-Customer-Admin contact info → row lands in `customer_registrations` queue (or similar) → Super Admin reviews on `/admin` → approves → email goes to Customer Admin with a "set your password" link → Customer Admin logs in, sees empty team, invites Sales Reps.

2. **Super Admin-initiated invite:** Arpit or AM creates a customer record in the new portal (for an existing 350-customer retailer being onboarded to the new portal) → sends invite email to Customer Admin → Customer Admin sets password, logs in. No approval queue needed (Arpit pre-approved by creating the record).

Customer Admin then invites Sales Reps within their company in either case.

### Sub-session breakdown — actual order shipped (not the original plan)

1. **Sub-session 1: Auth foundation + role model** — ✅ SHIPPED (`5166da7`). Supabase Auth, app_role enum migration, user_profiles table, capability flag columns, 6 SECURITY DEFINER helper functions, seed Arpit + Heritage CA. DB-only, no UI.

2. **Sub-session 2: Login UI + auth flows** — ✅ SHIPPED (`c337be7`). /login, /forgot-password, /reset-password pages with Server Actions. /auth/callback PKCE handler. /logout (initially as GET route; later moved to Server Action — see §13 logout-prefetch lesson). Next 16 proxy (`src/proxy.ts`) with public-route whitelist + redirectTo sanitization. Authenticated route group + TopNav with user+logout cluster. PasswordInput component. **REORDER:** original plan had this slot as RLS redesign, but Sub-session 1's tail audit flagged that fetch paths use cookie-bound clients and would break under real RLS with no login UI in place. Login UI swapped in here, RLS pushed to Sub-session 3.

3. **Sub-session 3: RLS redesign + ownership model** — ✅ SHIPPED (`3d72193`). Drop 21 dev-mode policies. Add `orders.started_by_user_id`, `order_owners` join table, `user_profiles.can_manage_order_owners` flag. Real per-role RLS on 23 tables. 2 BEFORE UPDATE immutability triggers + `current_user_can_update_order` helper. 10-test impersonation matrix (25/25 pass). Migration 40 fixed an orders ↔ order_owners policy recursion (42P17) caught at runtime via 2 new SECURITY DEFINER helpers.

4. **Sub-session 4: Action layer swap + hardcoded user removal** — ✅ SHIPPED (`1241802` initial, `9e029ba` final post-debug). 7 write paths swapped from service-role to cookie-bound. `create_order_draft` + `submit_order` RPCs. Existing 3 save_order_* RPCs grow `assert_can_modify_order`. `hardcodedUser.ts` DELETED. Prod-only logout-prefetch bug (Sub-session 2 retroactive) found and fixed by converting /logout to Server Action. Lesson logged in §13.

5. **Sub-session 5: Customer Admin "Manage my team" + invitation system.** BUILT; found in code 2026-10-15. Migrations 47–53 are applied to the portal DB. It covers:
   - `/team`;
   - the `createInvite` / `resendInvite` / `revokeInvite` / `finalizeInvite` / `setTeamMemberActive` / `updateTeamMemberFlags` Server Actions;
   - email through Supabase's built-in `inviteUserByEmail`, not Resend;
   - acceptance through `/reset-password`, so there is no `/invite/[token]`.

   **Remaining:** an end-to-end invite test (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`), and confirming the deploy status.

   **Invite-acceptance fix (2026-10-15).** As built, invites could not be accepted.
   - **The cause:** `inviteUserByEmail` runs server-side, so no PKCE verifier exists. Supabase's default link then puts the tokens in the URL `#fragment`, and `/auth/callback` (which only handles `?code=`) never sees them.
   - **The fix:**
     - `/auth/callback` now forwards `?token_hash=&type=` to a new public page, `/auth/confirm`.
     - `/auth/confirm`'s Continue button POSTs `confirmEmailLinkAction`, which calls `verifyOtp`. There is no token spend on GET, so link scanners can't burn it.
   - **Required dashboard setting:** in the Portal project's Auth → Email Templates → **Invite user**, the link must be `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite`.
   - **Also fixed:** an open redirect in `sanitizeRedirectTo`. `/\evil.com` and `/<TAB>/evil.com` resolved off-site; values are now checked with the WHATWG URL parser.

6. **Sub-session 6: Super Admin `/admin` + registration approval + Dia-Co staff creation.** DROPPED 2026-10-15. Per the ERP plan, the registration queue and staff accounts live in the ERP, and invites of a customer's first Customer Admin start from the ERP's Customer Master (`ERP_INTEGRATION_CONTRACT.md` §9).

7. **The ERP integration,** per `ERP_INTEGRATION_CONTRACT.md` §12.
   - **Step 1a (identity links)** works end to end on ERP staging (2026-10-16).
     - ERP: SQL, two Edge Functions and `portal.test.js`.
     - Portal: a migration, `src/lib/erp/*`, `/api/erp/invite` and `/api/erp/link-revoke`, and `finalizeInvite` → `link.confirm`.
   - **Step 2 (read path)** is on staging: `/orders` and `/orders/[orderId]` read from the ERP for linked logins.
   - **Step 3 (order intake) works end to end on ERP staging (2026-10-19).**
     - **Submit:** `submitOrder` sends the order (`order.submit`), and the Portal's copy becomes `submitted`.
     - **Active tab:** a "Received" card until an AM creates the order; then the ERP order, keeping the customer's own label.
     - **Drafts tab:** a declined order comes back with the reason, and "Edit and send again".
     - **Without the ERP configured,** Submit works as before.
   - **Status and the run-it-end-to-end steps** are in the contract's §0.
   - **Step 1b (the ERP's Customer Master "Portal access") works end to end on ERP staging (2026-10-20).** ERP code only.
   - **Step 4a (design review) is built (2026-10-20); nothing is applied or deployed yet.**
     - **ERP:** Send to Client Review saves what the customer sees (`data.portalReviews`); new SQL file `db/2026-10-20-portal-design-review.sql`; gateway op `order.design`.
     - **Portal:** `fetchErpOrderPage` reads it, and the order page shows the gallery, versions, `ErpQuoteCard` and `ErpReviewRail`.
   - **Next:** switch on and test Step 4a, then Step 4b (customer requests).

**Heritage Fine Jewelers test setup:** Arpit will provide a dummy personal email. The existing hardcoded customer record gets promoted to a real account tied to that dummy email. Used as a live test account throughout Phase 2C+.

**Session length / token expiry:** Accepting Supabase defaults (1 hour access token + auto-refresh via refresh token = effectively "stay logged in until you log out"). Standard B2B SaaS pattern.

**Email provider:** Resend (default — fastest setup, clean DX).

### What Phase 2C is NOT shipping

- No AR view (Phase 2E)
- No payment portal (Phase 2E)
- No AM views (Phase 2D)
- No messaging (Phase 2E)
- No accounting features (Phase 2E + 3.2)
- No customer migration from old portal — old portal stays live and unmodified during Phase 2C
- No old-portal retirement — that happens at first ship, after 2C + 2D + 2E together

---

## 17. Validation rules (from Phase 2B — Step 6, in `submitValidation.ts`)

[Preserved from prior context. See `submitValidation.ts` in repo for canonical rules.]

---

## 18. Drafts tab — final spec (Phase 2B Step 7)

[Preserved from prior context.]

---

## 19. Section-level warning system — final spec (Phase 2B Step 6)

[Preserved from prior context.]

---


## 20. Reference docs in repo

- `PROJECT_CONTEXT.md` — this doc, current project state, updated each session
- `ERP_INTEGRATION_CONTRACT.md` — **the integration contract with Dia-Co Internal (the ERP)**: operations, mappings, security, work list, open decisions
- `PROJECT_HISTORY.md` — backlog, lessons learned, session log. NOT auto-loaded. Reference when planning a phase or revisiting prior decisions.
- `EXISTING_SYSTEMS_REFERENCE.md` — comprehensive reference for existing web portal + internal software
- `SCHEMA.md` — full DB schema
- `DESIGN_REFERENCE.md` — orders list + history mockup
- `DETAIL_DESIGN_REFERENCE.md` — order detail page mockup
- `ORDER_ENTRY_DESIGN_REFERENCE.md` — order entry form mockup
- `PHASE_2B_BRIEF.md` — Phase 2B build brief (Session 12)

---

## 21. For next session — START HERE

1. **Read, in this order:**
   - this doc's top banner;
   - `ERP_INTEGRATION_CONTRACT.md`;
   - the ERP repo's `PLAN_Internal_Portal_Integration.md`.

   `EXISTING_SYSTEMS_REFERENCE.md` is history (the Orderwise era).
2. **Finish SS5.**
   - With `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, sign in as the Heritage Customer Admin test account.
   - Invite a test address from `/team`, accept it through the email, and confirm the new user lands on `/orders` with the chosen role and flags.
   - Then test resend, revoke, deactivate and reactivate.
3. **Rule on the contract's open decisions (D1–D12)** before building the integration. Who signs off is unsettled: this doc names Arpit as owner, and the ERP's docs name Chandar.

### Local development (added 2026-10-15)

- **Install and run:** `npm ci`, then `npm run dev` → http://localhost:3000. Local dev talks to the **live** Portal Supabase project (`rnwslatnbcrasjambabt`); there is no Portal staging project yet.
- **Env files** (both gitignored):
  - `.env` holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - `.env.local` holds `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, optionally `SUPABASE_SERVICE_ROLE_KEY` (needed for invites), and optionally `DEV_AUTO_LOGIN_EMAIL` / `DEV_AUTO_LOGIN_PASSWORD`.
  - **`.env.local` overrides `.env`, and an empty value there overrides a real one.**
  - **ERP connection (optional; unset means "not configured" and the Portal works without ERP data):**
    - `ERP_GATEWAY_URL`: `https://<erp-ref>.supabase.co/functions/v1/portal-gateway`.
    - `PORTAL_GATEWAY_SECRET`: Portal → ERP signing.
    - `ERP_ADMIN_SECRET`: ERP → Portal signing.
    - These must match the ERP's function secrets, and are server-only, never `NEXT_PUBLIC_`.
    - `npm run check:erp-signing` confirms the signing format still matches the ERP's.
- **Dev auto sign-in:** `devAutoLogin()` in `src/lib/supabase/proxy.ts`. It runs only under `next dev` and only on protected routes, and it applies the same profile and deactivation checks as `/login`. `/login` itself never auto-signs in.
- **Test accounts:**
  - `chandar@diacoglobal.com`: Super Admin. Sees all orders; cannot create orders or use `/team`.
  - `chandar+heritage@diacoglobal.com`: Customer Admin, Heritage Fine Jewelers. Can create orders and use `/team`.
  - `arbhanderi722@gmail.com`: Customer Admin, Heritage.
- **Creating a user by hand needs three rows:** `auth.users` (Dashboard → Authentication → Add user, Auto Confirm), `public.users` and `user_profiles` (SQL Editor). Customer-side users need `customer_id` on both, plus `customer_rep_role` on `public.users`.
- **Deleting a login cascades `user_profiles` but leaves `public.users` behind.** A recreated login with the same email then fails with `users_email_key` until the orphan is removed.
- **Check the project ref in the dashboard URL before running SQL.** Four Supabase projects are now in play: Portal, ERP staging, ERP production, and a future Portal staging.

**Things to NOT do without re-confirmation:**
- Don't touch existing portal/software
- Don't build integration pieces that contradict the ERP plan or `ERP_INTEGRATION_CONTRACT.md`; treat the ERP repo as read-only from Portal sessions unless asked
- Don't bypass pre-step conversation pattern
- Don't break shipped functionality during Sub-session 5 — every existing flow needs to keep working
- Don't generate Database types — keep using inline any
- Don't implement real Supabase Storage in this phase
- Don't blanket-approve `supabase db *` or any other category wildcard
- Don't mix up role terminology — Sales Rep / Customer Admin / Accounting / AM / AR / Super Admin
- Don't add GET endpoints with side-effects — see logout-prefetch lesson in §13. Any state-changing endpoint must be POST-only.
- Don't seed a new user without both `auth.users` AND `public.users` AND `user_profiles` rows. Sub-session 4 Migration 18 caught the trap.

**Production state:**
- **Last known deployed commit:** `9e029ba`, Phase 2C Sub-session 4 (logout-prefetch fix), in the original repo. Sub-sessions 1-4 are live at https://diaco-portal.vercel.app.
- **SS5:** its database migrations are applied to the shared Portal project. Whether its app code is deployed is unverified; check the Vercel dashboard.
- **This working copy** is `rathichandar/diaco-portal`, a fresh import.

**Useful diagnostic script kept from Sub-session 4 debugging:** `scripts/diagnose-prod-auth.ts` — signs in as Arbhanderi and prints JWT claims + session sizes. Useful for any future "is the token / cookies wrong" investigation. Run via `npx tsx scripts/diagnose-prod-auth.ts`.

---

*End of context document. Phase 2C Sub-sessions 1-5 built (SS5 E2E test pending). Next: the ERP integration per `ERP_INTEGRATION_CONTRACT.md`.*
