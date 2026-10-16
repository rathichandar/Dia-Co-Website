# Existing Systems Reference

**Last updated:** May 25, 2026 (Session 14 strategic planning)
**Purpose:** Capture EVERYTHING the existing web portal and existing internal software do, so this project always has a faithful reference for what we're replacing, what we're sync'ing with, and what we still need to migrate. This doc is reference material — read it when planning a phase, scoping sync work, or designing a new feature that touches existing-system territory.

**Read together with:** `PROJECT_CONTEXT.md` (current project state) and `SCHEMA.md` (new portal DB schema).

> **⚠ HISTORICAL as of 2026-10-15: do not plan integration work from this document.**
>
> The "existing internal order management software" described below (locally hosted in the LA office,
> built by an outside dev team) is **Orderwise**. It was replaced on **2026-08-08**, when about 2,420 orders were
> imported into **Dia-Co Internal**, a cloud ERP on its own Supabase projects that Dia-Co builds itself
> (repo `C:\Users\Chandar\Desktop\Dia-Co-portal\Dia-Co-Portal`). The Portal integrates with that ERP, not
> with Orderwise.
>
> **What no longer holds:**
> - §2 (what syncs today)
> - §9 (sync strategy: existing endpoints only, AR/payment standalone)
> - §10's endpoint audit
>
> **Current sources:**
> - `ERP_INTEGRATION_CONTRACT.md` (this repo)
> - the ERP's `files/diaco-internal-context/reference/PLAN_Internal_Portal_Integration.md`
>
> **Still useful:** §3–§6 as a record of what the business does and of the old system's gaps. Each
> workflow now lives in the ERP; check the ERP's `APP_OVERVIEW.md` for how.
>
> **Open:** what the old ASP.NET customer portal connects to since Orderwise was retired, and when
> it is switched off (contract D12).

---

## 1. The two systems at a glance

Dia-Co runs on **two distinct codebases**, built by the same external dev team at different times, deployed to different places.

### 1.1 Existing customer-facing web portal

- **Stack:** ASP.NET Core 9 / C# / SQL Server / AWS S3
- **Hosting:** Cloud (publicly accessible URL)
- **Users:** Customers only (~350 retailers, ~65% actively logging in)
- **Database:** Separate from the internal software (two databases that talk via sync mechanisms — details unknown until API audit)
- **Role:** Customer-facing surface for order placement, CAD review, approvals, and viewing invoices/stock designs
- **Status in this project:** Being replaced by the new Dia-Co Portal. Will be retired at first ship.

### 1.2 Existing internal order management software

- **Stack:** Not formally documented in this project's context. Assumed similar tech to web portal (same dev team). LOCALLY HOSTED — only accessible from inside the Los Angeles office network.
- **Hosting:** Local server in LA office. Mumbai designers connect through a firewall, which causes slow file uploads.
- **Users:** All Dia-Co internal employees (AMs, CAD designers, CAD manager, production team, QC team, AR person, AP person, Arpit). NO customer access.
- **Database:** Separate from web portal. Source of truth for most business operations.
- **Role:** Runs ~90% of Dia-Co's business operations. Customer master, full order lifecycle, CAD workflow, production tracking, QC, invoicing, AR, AP, pricing master, reporting, vendor master, job card printing.
- **Status in this project:** Will run alongside the new portal indefinitely. Workflows migrate to the new portal over time (Phase 3+). Eventual retirement is the long-term goal but has no fixed timeline.

---

## 2. Sync between the two systems (TODAY)

The two existing systems sync several flows. This is the **"sync that works today"** baseline — anything in this section is presumed to keep working once the new portal replaces the old web portal, as long as the new portal's sync surface matches the old portal's. Anything NOT in this section either doesn't sync today or syncs unreliably.

### 2.1 What syncs today (presumed working)

**Customer registration:** Customer signs up on the web portal → record lands in a "registration queue" in the internal software for AM/Super Admin to approve.

**Customer-placed orders:** Customer places an order on the web portal → order lands in a queue in the internal software. AM reviews, can edit, clicks "Save" → order is assigned a DG number (e.g., `DG-10001`) → DG number is sent back to the web portal so the customer sees it.

**Order created in internal software (text/email orders):** AM creates an order in the internal software for a customer who sent it via text/email → AM clicks "Send to Web" → order appears in the customer's portal account. **KNOWN BUG:** this sync only works if "Send to Web" is clicked BEFORE any status change. If the order has progressed in status, the sync silently fails or doesn't update properly.

**CAD render delivery:** When the internal software status changes from "Admin Review" to "Client Review", the renders + quote + metal/stone details get pushed to the web portal so customer can see them.

**Status updates:** Internal software status changes (e.g., "Approved", "In Production", "QC", "Final QC", "Shipped") flow to the web portal. Customer sees status updates in the portal.

**Ship date changes:** When AM updates ship date in internal software, the web portal updates too. **The portal shows expected ship date + 2 days** (buffer) — never shows the full internal roadmap.

**Mod requests + approvals (customer → AM):** Customer's actions in the portal (approve project, request modifications, etc.) flow into the internal software as queue items for the AM.

**Approval flow (AM → customer):** When AM manually approves a project in the internal software, the portal shows "Approved" to customer.

**Invoice delivery:** When AM creates an invoice in the internal software (at order completion), the invoice PDF is pushed to the web portal so customer can view it.

**Shipped notification:** When order ships, the portal updates and customer sees "Shipped" status.

**Stock designs:** When the CAD manager publishes a stock design in the internal software, it appears in the stock design section of the web portal. **KNOWN ISSUE:** Renders aren't being processed into thumbnails, so high-quality full-resolution renders slow the stock design page significantly.

### 2.2 What does NOT sync today (gaps)

These are flows where the two systems are not connected, or only loosely connected:

- **Payments and balances.** When a customer pays an invoice (via check, wire, ACH, in-person), the payment is entered in the internal software by the AR person. **There is no payment portal in the web portal today.** Customer cannot see their account balance, payment history, or outstanding invoices in the portal.
- **Account summary / AR data.** Customer's outstanding balance, overdue balance, terms, credit limit — none of this is visible in the portal today. Lives only in internal software.
- **AM-customer messaging.** No chat or messaging feature in the portal today. Customer-AM communication happens via email and text, outside both systems.
- **Engraving details.** Customer engraving requests (text, position, logo) are not captured in the internal software's order data model. AMs typically write them in a free-text "notes" field that doesn't flow well into job cards.
- **Center stone details (the way the new portal captures them).** The internal software's center stone model is less structured than what the new portal captures (ranges for carat/color/clarity/make, mm dimensions for customer-supplied stones, etc.).
- **PO and Customer Name separately.** Internal software lumps these into a single field. New portal separates them.
- **"Additional details for the AM"** as a structured field. Internal software doesn't have this.
- **Drop shipping address per order.** Internal software's shipping data is per-customer (their default address), not per-order. New portal captures per-order shipping addresses including drop-ship to third parties.
- **Credit cards on file.** Not stored in either system today.

### 2.3 The sync as a technical artifact

The two systems sync via API endpoints — some are known to exist, the full list will be audited in the next session. As of this doc:

- **Endpoints we know exist:** Order DG-number assignment (internal → portal), "Send to Web" (internal → portal), CAD render push (internal → portal), status update (internal → portal), invoice push (internal → portal), stock design publish (internal → portal), registration queue (portal → internal), customer order placement (portal → internal), mod request (portal → internal), approval action (portal → internal).
- **Endpoints we know we'd want but don't exist:** Payment data sync (any direction), AR data sync (internal → new portal), messaging sync, anything custom for the new portal's richer data model.
- **Endpoint quality assumption:** Existing endpoints work and we'll build off of them. New endpoints from the existing dev team are NOT expected to be reliable on a tight timeline — we'll request what we need but plan for them to be late or imperfect.

---

## 3. The existing web portal (customer-facing) — full surface

### 3.1 User base

- ~350 retailer accounts
- ~65% of customers actively log in and use the portal
- ~35% don't use the portal — habit, antiquated preferences, comfort with text/email
- ~50% of all orders come through the portal; the other ~50% come via text/email/shipment intake (the AM enters them in the internal software, then optionally sends to portal via "Send to Web")
- Most customers are repeat customers placing many orders per year

### 3.2 What customers can do in the existing portal

- **Register.** Customer fills out a registration form → record goes to internal software's registration queue → AM/Super Admin approves → customer can log in.
- **Place orders.** Order entry form similar in structure to the new portal's. After submission, order goes to the internal software queue for AM review.
- **Review CAD designs.** When AM moves status to "Client Review," customer sees the renders + quote + metal/stone details.
- **Approve / modify / cancel orders.** Customer actions trigger queue items for the AM in the internal software.
- **Track production status.** Customer sees status updates as the order moves through the pipeline.
- **View invoices.** Once AM creates an invoice in internal software, customer can view/download the PDF in the portal.
- **View stock designs.** Pre-built designs published by the CAD manager. Includes live pricing — pulls metal spot, labor, and diamond pricing from the internal software's pricing master.

### 3.3 What customers CANNOT do in the existing portal (gaps)

- **Pay invoices.** No payment portal.
- **See account summary.** No outstanding balance, no overdue balance, no payment history.
- **Message their AM.** No chat or messaging feature.
- **See engraving details on their orders.** Engraving is in AM's notes, not structured.
- **See order history searchable / filterable.** Limited reporting on the customer side.

---

## 4. The existing internal order management software — full surface

This system is huge. Roughly organized by role/workflow below.

### 4.1 Customer master (used by everyone, owned by AMs / Super Admin)

- All ~350 customer records (active + inactive)
- Per-customer fields:
  - Contact info, billing address, shipping address (default)
  - **Terms** (e.g., Net 30, Net 60, COD, etc.)
  - **Credit limit** (if set)
  - **Internal designing standards** — prints on every job bag for orders for this customer (e.g., "always use 4-prong heads, never 6-prong" or specific style preferences)
  - **Internal production standards** — same idea, production preferences
  - Assigned AM
  - Account status (active/inactive/on hold)

### 4.2 Order lifecycle (the heart of the system)

Every order in the internal software moves through a status flow. Below is the canonical lifecycle as far as I understand it from Arpit's description:

1. **New order** — order arrives in queue (either from web portal sync or AM-entered from text/email)
2. **AM saves** — order gets DG number (`DG-#####`), AM has optionally edited details
3. **CAD assignment** — CAD manager assigns to a designer with a point value (hours estimate)
4. **In CAD design** — designer works in Matrix/Rhino, uploads files when done
5. **Admin Review** — designer has uploaded; AM reviews renders, edits metal/stone details, sets quote
6. **Client Review** — AM sends to customer; customer sees in portal, can approve/modify/cancel
7. **Modification requested** — customer requested changes; back to CAD designer queue with error/mod marker
8. **Approved** — customer approved; AM picks a roadmap preset (see §4.3)
9. **In production** — moves through production steps based on roadmap
10. **Final QC** — production complete, QC team works through checklist
11. **Invoice created** — AM generates invoice; PDF goes to portal
12. **Shipped** — order ships; customer notified via portal
13. **Closed** — order complete (status name TBD)

The internal software also tracks **error requests** (when AM finds CAD mistakes and sends back to designers), and the AM status appears in the production flow occasionally when production hands an order back to the AM for something.

### 4.3 Roadmap presets (used by AMs at approval time)

When an order is approved, the AM selects a roadmap preset that determines the daily budget for each production step. Each preset has different time budgets:

- **Standard:** 1 day print, 1 day cast, 3 days clean, 3 days set, 1 day final polish, 1 day final QC
- **Jewelers backlog:** Cleaning time extended (up to 6 days)
- **Rush:** Shorter timeline
- **Priority Rush:** Even shorter, premium pricing
- **Complex setting:** Setting time extended to 6 days
- Others may exist; this is the set Arpit listed

Once a roadmap is set, the system can identify when a project is falling behind schedule (e.g., setting deadline lapsed without status moving past "set"). Reports surface delayed projects. AMs can update the ship date if a project falls behind, which **recalculates the roadmap forward** and pushes a new ship date (+2 day buffer) to the web portal.

### 4.4 AM workflow (the busiest role)

AMs do an enormous amount in the internal software:

- Save customer orders that came from portal sync (review, optionally edit, click Save → DG number)
- Create orders for customers who sent via text/email, then optionally Send to Web
- Review CAD designer uploads at Admin Review stage
- Edit metal/stone details after CAD review
- Set quotes (line items, totals)
- Save mod requests and approval requests that came from the portal
- Submit their own mod/approval requests when needed
- Track personal sales performance, projects-in-flight, all reporting at the AM level
- Track outstanding customer balances per customer (AR data, read-only for AMs)
- Will track commission eventually (each AM gets a different % of their own customers' sales — feature exists / is planned)
- Manage their assigned customers as the single point of contact
- Set roadmap presets at approval time
- Change ship dates as needed
- Create invoices at order completion
- Send "shipped" notification

The AM is the spider in the web — they touch every order, sometimes many times.

### 4.5 CAD workflow

**CAD manager / Admin queue:**
- Sees all new orders, mod requests, error requests in a unified queue
- Assigns each project to an individual designer
- Sets a **point value** (estimated hours for the work)
- Tracks which projects are with which designers
- Has access to designer efficiency reports + team efficiency reports

**Individual CAD designer:**
- Sees their assigned tasks in their login
- Does actual 3D modeling externally in **Matrix or Rhino** (NOT in the internal software — this stays separate regardless of any migration)
- Uploads when done: 3dm file, stl file, renders, detail images
- Upload moves the order to "Admin Review"
- Mumbai-based; uploads go through a firewall to the LA-based server, which is SLOW (real productivity issue)

**Stock design flow (separate from custom):**
- Super Admin or CAD manager creates stock design "orders" for designers to work on in off-time
- Designers create the stock design (renders + 3dm/stl)
- Designers add metal/stone details to create a quote
- CAD manager or Super Admin reviews the design and details
- If approved, they click "Save" → stock design is published to the web portal immediately (visible to all customers in stock designs section)
- Live pricing — pulls current metal spot, labor, and diamond pricing from internal software's pricing masters
- **Known issue:** No thumbnail generation; full-res renders slow the stock design page

### 4.6 Production workflow

Production team handles printing, casting, cleaning, setting, polishing, hand engraving, laser engraving, enameling, watch work. All in-house in LA EXCEPT setters, who are independent contractors paid per stone/style.

**Status changes:** Production team manually changes the order's status as it moves through each step. The roadmap allows reporting on whether each step finished on time.

**Job card printing:** For each order, a printed job card is generated. The job card includes:
- Order images
- All instructions (general + customer-specific design/production standards from §4.1)
- Barcode
- The full roadmap
- Other order metadata

The job card is **physically circulated** through the office along with the metal/material. Each jeweler / setter / polisher works on their portion based on the card.

**Final QC:** Has its own dedicated view. The QC team clicks checkboxes to confirm every item on the order was checked. The system tracks which employee did the QC + when. Status updates to "Final QC" in the portal.

**Workshop (jewelers specifically):**
- Workshop manager exists but doesn't assign jobs in the computer (would be too time-consuming with 10-12 jobs/day per jeweler)
- Manager puts the physical job bag on a jeweler's table
- The jeweler **barcode-scans IN** when starting and **barcode-scans OUT** when finishing
- Can pause (e.g., if interrupted) and resume
- Timer tracks actual time spent
- **Complexity** (estimated minutes) is written on the physical job bag by the workshop manager — NOT in the software currently
- Efficiency tracking (complexity vs. actual minutes) currently happens in a Google Sheet, not in the software (because the dev team is slow to add new features). Eventually Arpit wants this in the new portal.

### 4.7 AR (Accounts Receivable) workflow

The AR person uses the internal software. There is currently ONE AR person; might hire more later.

- **Invoice tracking:** All invoices created by AMs, with line items + totals + terms per customer
- **Outstanding + overdue balances per customer**
- **Summary tab:** Shows balance, terms, breakdown of invoices, breakdown of payments, what each payment was applied to
- **Bank deposit tab:** AR person inputs every payment that comes in (check, wire, ACH, in-person) and assigns it to specific invoices. Payments can be split across invoices, and invoices can carry partial balances.
- **Discounts tab:** When customer requests a discount, currently AMs apply manually and approve. AR person could do this if given permission.
- **Returns tab:** When customer returns merchandise. Currently AMs apply manually and approve.
- **Call notes:** Lightweight CRM-style notes attached to a customer (e.g., "called about overdue invoice, customer promised payment by Friday")
- This system is functional but Arpit notes it "could be more robust"

### 4.8 AP (Accounts Payable) workflow

The AP person uses the internal software. Separate from AR.

- **Bill entry:** Vendor bills (casters, setters, contractors, suppliers). E.g., K&K Casting sends a $50,000 bill where each line item ties to a specific DG order. AP enters by weight × rate, assigned to the DG order.
- **Per-order profit tracking:** Because AP bills are tied to DG orders, the system computes per-order profit (revenue - AP costs)
- **Payable tab:** Shows outstanding balance to each vendor; prepares checks
- **Statements:** Print statements of what's being paid
- **Credit tracking:** If vendor extends credit, track it
- **Note:** Setters/contractors are paid per stone/style — these bills also feed into per-order profit

AP is **not** in scope for the new portal anytime soon. It lives in production-side workflow and stays in the internal software indefinitely (per Arpit, Session 14).

### 4.9 Pricing master (the spine of quoting)

- **Stones master:** Pricing per shape × size × color × clarity for natural diamonds. Separate pricing for lab-grown (single color/clarity tier). This is for ACCENT STONES, not center stones.
- **Labor master:** Pricing per setting style × shape × size. Massive table.
- **Metal master:** Pricing rules per karat × color × weight. Gold spot price is MANUALLY entered (not auto-pulled from a market feed).
- **Stone shapes master, vendor master, terms per customer, etc.** All in the internal software.

Stock designs use live pricing from these masters when displayed in the web portal.

### 4.10 Vendor master

- All vendors (setters, casters, laser engravers, hand engravers, polishers, suppliers, etc.)
- Categorized by type
- Contact info per vendor
- Used by AP, also referenced by production

### 4.11 Reporting

The internal software has heavy reporting. Categories Arpit mentioned:

- P&L (profit and loss)
- AR aging reports
- AP reports
- Customer-wise reports (orders, profits, order count, order cadence)
- AM-wise reports (sales by AM, projects)
- CAD designer efficiency (points assigned vs. time actually taken)
- Workshop / jeweler efficiency (currently in Google Sheet, not software)
- Production schedule adherence (orders behind roadmap)
- QC compliance
- Project-wise full history

This reporting is one of the most valuable parts of the internal software. Migration to the new portal in Phase 3+ has to preserve and ideally improve it.

### 4.12 Order history per customer

Per-customer tab showing every order that customer has ever placed, status, timeline, profit, etc. Full historical view.

---

## 5. Who uses what (cross-reference)

| Role | Existing web portal | Existing internal software |
|---|---|---|
| Customer (Sales Rep) | Yes (place orders, review CAD, approve, view invoices, view stock) | No |
| Customer (Customer Admin) | Yes (same as Sales Rep — no admin features today) | No |
| Customer (Accounting) | Does not exist as a separate role today | No |
| AM | No (none of the AMs log in to the web portal) | Yes (heaviest user) |
| CAD designer (individual) | No | Yes (assigned tasks, upload) |
| CAD manager | No | Yes (queue, assignment, points, stock designs, reporting) |
| Production team | No | Yes (status changes, barcode scans, job cards, QC) |
| Workshop manager | No | Partially (assigns jobs physically, not in software) |
| AR person | No | Yes (invoices, payments, balances, call notes, statements) |
| AP person | No | Yes (bills, payables, statements, profit tracking) |
| Super Admin (Arpit) | No (typically) | Yes (full access; uses for reporting, oversight, stock designs) |

**Observation:** The web portal serves customers only. Every internal employee lives in the internal software. The new portal closes this gap by being the cloud-native home for internal employees too (starting with AMs in Phase 2D, then AR and others in later phases).

---

## 6. What the existing systems DON'T do well (gaps + pain points)

These are explicit pain points Arpit has identified. Each is a motivation for the new portal.

### 6.1 Gaps in the existing customer web portal

- No payment / AR / balance / invoice payment functionality
- No customer-AM messaging
- No engraving detail capture (lives in AM's freeform notes)
- No structured center stone capture (the way the new portal does ranges, mm, etc.)
- PO and Customer Name aren't separated
- No "Additional details for the AM" structured field
- Drop ship per-order addresses aren't captured
- No credit cards on file
- Stock designs page is slow (no thumbnail generation)

### 6.2 Gaps in the existing internal software

- Same data model gaps as 6.1 — engraving, center stones, drop ship, PO/Name split, AM notes — none are well-structured in the internal software either, because the internal software's data model is older and rougher than the new portal's design.
- Workshop efficiency tracking lives in a Google Sheet, not the software
- Locally hosted (LA office) — Mumbai office struggles with slow uploads through the firewall, and remote work is impossible
- Slow to iterate — external dev team takes a long time to add features
- No real customer communication trail — everything is text/email outside both systems
- Order messaging history isn't captured anywhere systematically
- Stock design thumbnail issue

### 6.3 Operational pain points

- **Sync bug:** "Send to Web" only works pre-status-change. After status changes, sync fails silently.
- **Mumbai uploads:** Slow firewall transfer to LA server is a daily friction
- **Dual-source of truth risk:** AR data lives only in internal software. Customers don't see balances. Calling/emailing for balance questions is friction.
- **Locally hosted:** Office internet issues affect ALL Dia-Co operations. No work-from-home capability for internal team.
- **Dev team velocity:** Slow to ship changes. Workshop tracking sitting in a Google Sheet is the canonical example.

---

## 7. What's NOT going away soon

Even with aggressive migration plans, these are anchored in the internal software for the foreseeable future:

- **AP workflow** — bills, vendor payments, profit tracking. Stays in internal software. Not in scope for any near-term phase.
- **Pricing master** — until Phase 3.1 (automated pricing engine on new portal). Stock designs depend on this.
- **Production status changes** — until Phase 3+ production migration. Job cards print from internal software.
- **CAD designer workflow** — until Phase 3.0+ (deferred from first ship per Session 14 decision)
- **AR employee workflow** — until accounting fully migrates to new portal in Phase 3.2. New portal will have a customer-facing AR view + payment portal at first ship, but the AR EMPLOYEE keeps using the internal software for payment application, bank deposits, statements, etc.
- **Reporting** — until each domain migrates, internal software remains the report source

---

## 8. The migration runway

Where each capability lives over time:

| Capability | Today | First ship (Phase 2 complete) | Phase 3.0+ | Phase 3 mature |
|---|---|---|---|---|
| Customer order entry | Old portal | New portal | New portal | New portal |
| CAD review / approve / mod | Old portal | New portal | New portal | New portal |
| Customer messaging | None | New portal | New portal | New portal |
| Engraving details | None structured | New portal | New portal | New portal |
| Customer AR view | None | New portal (standalone, no sync) | New portal (synced) | New portal (native) |
| Customer payment portal | None | New portal (Stripe/ACH, no sync) | New portal (synced) | New portal (native) |
| AM workflow | Internal software | Internal software + new portal (partial — messaging, engraving, history) | Internal software + new portal | New portal |
| Invoicing | Internal software | Internal software (synced PDFs to new portal) | Internal software | New portal |
| AR employee workflow | Internal software | Internal software | Internal software | New portal |
| AP workflow | Internal software | Internal software | Internal software | Internal software (long-term) |
| Pricing master | Internal software | Internal software | Internal software | New portal (Phase 3.1) |
| CAD designer workflow | Internal software | Internal software (Option A — deferred) | New portal (Phase 3.0) | New portal |
| Stock designs | Internal software → old portal sync | Internal software → new portal sync (carried over) | New portal native (Phase 3.0) | New portal |
| Production workflow | Internal software | Internal software | Internal software | New portal (latest) |
| QC + job cards | Internal software | Internal software | Internal software | New portal (latest) |
| Reporting | Internal software | Internal software (everything) | New portal (customer + AR domains) | New portal (all) |
| Vendor master | Internal software | Internal software | Internal software | New portal (during AP migration, if it happens) |
| AM commission tracking | Planned / not implemented | New portal (if reasonable) | New portal | New portal |

---

## 9. Sync strategy summary (Session 14 lock)

Given that Arpit doesn't trust the existing dev team to build new APIs reliably:

**Build off of existing endpoints only.** Don't depend on new API work from the existing dev team for first ship.

**Existing endpoints carry forward:** DG number assignment, "Send to Web" (mod the bug), CAD render push, status updates, ship date updates, invoice PDF push, stock design publish, customer registration queue, order placement, mod requests, approval actions.

**New things we'd LIKE to sync but won't depend on:** Payments, balances, customer messaging, engraving details (the new portal's richer data model fields).

**For first ship, AR/payment is STANDALONE in the new portal.** Customers pay through the new portal via Stripe/ACH. Those payments and balances live only in the new portal. External payments (check/wire/in-person paid through other channels) DON'T appear in the new portal. There will be temporary inconsistency between portal-shown balances and reality for any customer who pays outside the portal. Customers will be told this directly.

**Try-but-don't-block:** We can request that the existing dev team build a sync API for payments/balances. Provide them with extremely precise specs. But the first-ship plan assumes they DON'T deliver in time. If they do, great; we add the sync. If not, we ship standalone and customers pay through the new portal directly.

**Long-term:** As accounting/AR functionality migrates fully to the new portal in Phase 3.2, sync needs shrink. Eventually invoicing is native to the new portal, payments are native, and the internal software's AR module is retired.

---

## 10. Open questions / future investigation

These need answers before specific phases can be scoped fully:

1. **API endpoint audit.** Get the full list of existing endpoints from the web portal codebase (next session). Look in `Controllers/`, `Api/` folders. Search for `[HttpGet]`, `[HttpPost]`, `[Route(`, `ApiController`.
2. **Customer migration mechanics for first ship.** Auto-migrate ~350 customer accounts to the new portal (preferred) vs. fresh registration. Open: hard cutover vs. parallel run period for transition.
3. **In-flight order migration.** When the new portal goes live, active orders mid-production need to be visible there. Forklift import from old portal DB → new portal DB. Scope TBD.
4. **Historical order data migration.** Do customers see past orders in the new portal? Full history vs. last N months. Open.
5. **Old portal URL strategy.** Redirects vs. shutdown vs. read-only grace period. Open.
6. **Sync API requests to existing dev team.** Spec out payment/balance sync precisely; submit to them; treat any delivery as a bonus.
7. **Existing software schema.** Eventually, the new portal will need to read/write the internal software's data to do deeper migrations. Reading the internal software's schema (or getting DB access) is a future investigation, not first-ship.

---

*End of Existing Systems Reference. This doc is a living reference — update it whenever new information about the existing systems surfaces.*
