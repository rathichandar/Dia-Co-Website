# Dia-Co Portal — Phase 1 (MVP) Spec and Phase Roadmap

**Date:** October 20, 2026
**Decision-maker:** Arpit
**Builder:** Chandar
**Status:** Draft 2, for Chandar's review (adds self-registration queue; expands quote, render, and 3D model sync)
**Supersedes:** the Portal integration assumptions in `PLAN_Internal_Portal_Integration.md` (Aug 16, 2026) wherever the two conflict. The plan's architecture principles are carried forward in §2.

---

## 0. Read this first

**Purpose.** Define a Phase 1 that can launch in 1-2 weeks, and park everything else in later phases.

**Ground truth.** Chandar has already built most of the Internal-side Portal plumbing (Supabase Edge Functions, wired up) and has continued building the existing Portal (Next.js on Vercel). **This document was written without sight of that code.** Therefore:

- Where this document and the code disagree on *how* something works, the code is right. Report the difference to Arpit.
- Where they disagree on *what should happen*, the Phase 1 behavior rules in §3 and §4 win unless Arpit says otherwise.
- Items marked **VERIFY** need to be checked against the code before any work starts on them.
- Do not invent table names, column names, endpoints, statuses, or field values. If something is unknown, say so.

**Conventions.** American English. Staging first, then production. Arpit tests on staging.

---

## 1. Goal and constraints

**Goal.** A customer can place an order on the web that lands in Internal's review queue, watch it progress, receive its quote and invoice, review designs, and make requests, with Internal remaining the single system of record.

**Constraints.**

- Launch target: 1-2 weeks of build.
- **One user per company** in Phase 1.
- Rollout strategy (pilot group, who is invited first) is **not part of this document**. Arpit and Chandar will plan it after the build.
- Phase 1 is deliberately simple. Anything not in §3 is out of scope (see §9 and §10).

---

## 2. Architecture principles (carried over from the Aug 16 plan; VERIFY against the build)

1. **Internal owns the data** for orders, customers, and (later) messaging and accounting. The Portal displays it and submits into it.
2. **Customer records:** Internal's Customer Master is the single real customer record. Portal's `customers` row is a login shell for "Internal customer #X" (it needs something to hang `customer_id` off for Supabase Auth and RLS).
3. **Translations live in Internal, not Portal.** The customer-facing status mapping and the displayed ship date are both produced by Internal's RPC/edge layer. Portal holds no copy of the mapping rules and does no date math of its own.
4. **Edge layer plus RPCs.** Portal calls a thin edge layer on Internal (validates the shared secret, resolves Portal user to Internal customer once, in one place, logs the request). RPCs underneath do the transactional work. This is the pattern already described in the plan; Chandar has built it, so VERIFY the actual function names and auth method.
5. **Customer clicks never change production state directly.** They create requests that an AM actions in Internal.
6. **Never expose to customers:** raw `mfgStatus`, `cadStatus`, party/vendor names, designer names.
7. **Customer ownership of an order never changes after insert** (`orders.customer_id` is immutable on the Portal side).

---

## 3. Phase 1 scope

Each item lists the behavior to build. "Status" is unknown to me; Chandar fills it in (see §7).

### Group A: Orders in (Portal → Internal)

**P1-01 · Web order creation feeding an Internal queue**
- The customer builds and submits an order on the Portal.
- On submit it lands in Internal as a real row in a review state (the plan calls it `Portal Review`; VERIFY the actual name). It is not a separate holding system; it is a status on a real row, the same shape as an existing draft.
- An AM reviews it in Internal and saves it in. Only then does it become a working order.
- **Editing:** the customer can edit the order until an AM picks it up (claims it) in the review queue. After pickup the order is locked for the customer, and further changes go through a request (P1-12).
- No pricing is shown at submission. Pricing on the site is Phase 3. The customer sees "Quote pending" until Internal sends a quote (P1-08).
- VERIFY: how the AM "pickup" is recorded and how the lock is enforced; how an order number is assigned and shown before and after pickup.

**P1-02 · Reference image and file uploads on orders**
- Real uploads on the order form (references; engraving logo). As of Aug 18 Portal Storage was stubbed with no real upload.
- VERIFY how files move from Portal to Internal.
- **Security constraint:** Internal's `order-images` bucket has a known open vulnerability (anon INSERT/UPDATE permissions). Do not solve this by extending anon access, and do not make it worse.

**P1-03 · Priority Rush request**
- The customer can request Priority Rush on an order. It is a **request** reviewed by an AM, not an automatic change.
- Existing Portal copy says the AM confirms within 1 business day (as of Aug 18; VERIFY and keep consistent with how the AM team actually works).
- Internal rules that already exist: Priority Rush is incompatible with BTS; plain Rush is allowed. Do not rebuild those guards; make sure the request cannot bypass them.
- VERIFY: whether the Rush price line the Portal previously showed should still appear (the only pricing shown on the site in Phase 1 is the quote total Internal sends, see P1-08).

**P1-04 · Reorder (duplicate a past order)**
- From a past order, the customer can start a new draft pre-filled from it. The customer reviews and submits it like any new order (it goes through P1-01).
- **Chandar proposes** which fields copy over. Status, dates, quote, invoice, and design versions must not copy.

### Group B: Orders out (Internal → Portal)

**P1-05 · Orders created in Internal can be pushed to the Portal**
- An AM can create an order in Internal and push it to the customer's Portal account so the customer sees it.
- Only customers who have a Portal account can receive a push. VERIFY the behavior for customers without one.

**P1-06 · Status sync**
Customer-facing stages, in order:

`Designing → Needs review → In production → Final QC → Shipped`, plus `Cancelled` (also synced).

- The mapping from Internal's real status to these labels lives in Internal (plan: derived from `roadmapStagesFor()`-style logic). Portal receives the label; it does not map.
- "Needs review" means a design is ready for the customer to review.
- Invoice: the invoice PDF reaches the customer around Final QC/invoicing (see P1-09). VERIFY which Internal event triggers it.
- VERIFY: how the stages above map to the Portal's existing `status` / `sub_status` values, and whether any Portal-owned status values remain.

**P1-07 · Ship date sync**
- The date shown on the Portal is **Internal's ship date plus 2 business days**. Internal computes it (Internal already has `addBusinessDays()`); Portal never computes it.
- When the ship date changes in Internal, the new date is pushed to the Portal and an email notification is sent (P1-13).
- As of Aug 18 Portal did date math itself: a rolling "If approved today, ships X" estimate on the detail page and a "Late" comparison (`expected_ship_date < today`). VERIFY the current state, and remove or replace Portal-side estimating so there is one displayed date.

**P1-08 · Quote (PDF and total)**
- Internal sends two things per quote: **the PDF generated in Internal** and **the quote total**. The customer sees the total on the order and can open the PDF.
- Portal displays what Internal sends. It does not recompute or itemize the quote. As of Aug 18 Portal had its own quote display logic (`computeDisplayedQuote` in `src/lib/quote.ts`, grouped Stones/Setting subtotals, a Priority Rush line, and a ±5% footer). VERIFY, and retire or reduce that logic so there is one source of truth.
- When a new quote is sent (for example with a new design version), it replaces the "current" quote shown; earlier quotes stay attached to their design version (P1-10).
- Rule: **approving the design also accepts the quote shown** (decided Oct 20). See P1-12 for how that is recorded.

**P1-09 · Invoice PDF**
- Internal sends the invoice PDF to the Portal. The customer can open it from the order.
- Issued invoices do not change in Internal. If an invoice is superseded by a credit memo or discount, VERIFY how Phase 1 handles it (likely: only the issued invoice is shown; accounting views are Phase 4).

**P1-10 · Past design versions**
- Each design delivery from Internal arrives as a **new version; versions are never overwritten**. The customer can open previous versions.
- **Every version carries all of its renders and the 3D model URL.** Internal sends all renders for the version (not a selection), plus the 3D model URL. The customer sees every render and can open the 3D model link. As of Aug 18 the 3D viewer link was a placeholder; it must be real for launch. VERIFY how renders are transferred and stored (image files across projects have the same security constraint as P1-02).
- Each version also shows the quote (PDF and total, P1-08) that went with it, when Internal sent one.
- Comparing versions side by side is Phase 2.
- Never expose designer names. VERIFY whether any designer field is stored on Portal's version tables and whether `delivery_note` can carry designer names.

**P1-11 · Order activity timeline (the "thread")**
- From launch, the order page shows a history thread: status changes, notes, design uploads, and the customer's own requests, with dates. Internal already keeps an order history of this kind.
- **Decision needed from Arpit (see §6):** which Internal events and notes are customer-visible. Recommended default: only events explicitly designated customer-visible, never raw status, designer names, or party names.
- This is a read-only history in Phase 1. Two-way chat is Phase 2.

### Group C: Customer requests

**P1-12 · Requests (all handled by an AM in Internal)**
Customer actions create a request; none of them changes order state by themselves.

| Customer action | Becomes | Notes |
|---|---|---|
| Approve design | Approval request | Also accepts the quote shown. **Recommended:** record which design version and which quote version were on screen at the moment of approval. |
| Request changes | Change request (free text) | AM actions it; a new design version follows when ready. |
| Cancel | Cancellation request | Aug 18 Portal rule: offered in draft and designing only (VERIFY; see §6 Q2). |
| Edit after pickup | Change request | Before pickup the customer edits directly (P1-01). |
| Priority Rush | Rush request | See P1-03. |

- Every request appears in the timeline (P1-11) with its state (at minimum pending and actioned). VERIFY the states the build supports.
- Existing Portal order-detail buttons (Approve, Request modification, Cancel, Rush, "Message AM") were stubs as of Aug 18. Wire them to the request mechanism. Do not leave dead buttons in the launch build.

### Group D: Notifications

**P1-13 · Email notifications (Phase 1 set)**
Emails are sent when something needs the customer's attention:
1. A design needs review.
2. An order ships.
3. A ship date changes.

- As of Aug 18, Portal sent email only through Supabase's built-in email (about 4 per hour). That will not support notifications. Moving to a real SMTP/provider (Resend was the planned choice) is a **launch requirement**. VERIFY current state.
- Ship notification: status and date only (decided Oct 20). No tracking number or carrier link in Phase 1.
- Not requested for Phase 1: emails for quote ready, invoice ready, or cancellation. See §6 Q3.
- Notification preferences (including text) are Phase 2. In Phase 1 the three emails above are on for everyone.

### Group E: Access

**P1-14 · One user per company; two ways in (invite or self-register)**
- Each company has one Portal user at launch.
- Keep the data model multi-user-ready (the roles and capability flags already exist); Phase 2 turns on multiple users. Hide the Portal's `/team` screen for Phase 1 if it would let a customer add more users. **Chandar proposes** the enforcement.

*Path 1: invited from Internal*
- The AM invites an existing customer from Internal (Customer Master → Invite to Portal). The new account links to that specific Customer Master record. There is no ambiguity, because the AM picked the customer.

*Path 2: registered directly on the website*
- A customer can register on the Portal. The registration lands in a **new customer queue inside Internal**, which works the same way as the orders queue (P1-01): it is a queue in Internal that staff review, not a screen in Portal's own admin.
- An AM or Arpit reviews each registration and either **matches it to an existing Customer Master row** or **approves it as a brand-new customer**. On approval the registrant is sent a set-password email and the account links to that Customer Master record. A rejection or "needs more info" outcome should also be possible. VERIFY the outcomes the build supports.
- **Matching matters.** Customers have been re-created as duplicates before (an older uppercase record not recognized as a match). The queue should show likely existing matches by name, and approving as new must go through Internal's existing customer rules: customer code generation (locked at creation, no backfill) and duplicate-name blocking.
- **Before approval** the registrant has no access to orders or data. Recommended default: they see only a "pending approval" message and cannot place orders. **Chandar proposes** the exact behavior.
- **Registration fields: Chandar proposes**, with Arpit's confirmation (§6 Q5). Aug 18 Portal docs said phone and address were required to save a customer into the old software, and that Terms of Service acceptance was planned on the registration page (no Terms document exists yet).
- A public form can be abused. Recommended: basic bot and rate-limit protection, and a staff view that makes obvious spam easy to reject. Chandar proposes the approach.
- As of Aug 18 `/register` and the registration queue table were not built (shape marked TBD). VERIFY the current state.

### Group F: Viewing

**P1-15 · Past orders (shipped and cancelled)**
- Shipped and cancelled orders are viewable in a past-orders view (the Portal already has Active / Cancelled tabs and a History page).
- **History depth is for Chandar to propose** (all Internal history, launch-forward only, or a trailing window). Consider what Internal data shape a backfill depends on. Arpit has not decided.

**P1-16 · Search and filter orders**
- Add search and filters to the orders list. **Chandar proposes** fields. Suggested starting set, all of which exist in order entry: order number, client PO, end customer name, style number, and status/stage.

---

## 4. Decisions already made (do not re-litigate)

From the Oct 20, 2026 session with Arpit:

- Customer actions (approve, changes, cancel, rush) are **requests an AM actions in Internal**.
- **Approving a design also accepts the quote shown.**
- **Shipped orders show status and date only**, no tracking.
- **A customer can edit a submitted order until an AM picks it up** in the review queue.
- **One user per company** in Phase 1, either **invited from Internal or self-registered on the website**. Registrations land in a new customer queue in Internal, the same way orders do.
- **Quotes sent from Internal include the PDF and the quote total.**
- **All renders send with each design version, plus the 3D model URL.**
- Portal ship date = **Internal ship date + 2 business days**, computed in Internal.
- Order history thread is in Phase 1.
- Phase 1 additionally includes: reference uploads, reorder, search/filter, Priority Rush request.
- Rollout (pilot group, order) is decided after the build, with Chandar.

From earlier plans (still in force unless the code says otherwise):

- Internal is the source of truth for orders, messaging, and AR/payments.
- Portal customer data was disposable; only test logins mattered.

---

## 5. Context: what the Portal looked like on Aug 18, 2026 (STALE; use only as a starting point)

Everything in this section comes from the Portal-side status report dated Oct 20, 2026, which could only see Portal docs and chats up to Aug 18. Chandar has built since then. **VERIFY all of it.**

- **Stack and hosting:** Next.js 16.2.6 + TypeScript, Supabase (Postgres + Auth), Tailwind, hosted on Vercel (auto-deploy on push to `main`). Repo: `github.com/diaco-arpit/diaco-portal`.
- **Auth:** email/password, logout, forgot/reset password, PKCE callback, auth-gated routes. Roles: `sales_rep | customer_admin | accounting | am | ar | super_admin` with six capability flags on `user_profiles`.
- **Orders:** 9-section order entry with autosave, drafts, submit. List with Active / Cancelled / Drafts tabs. Order detail page: actions were stubs; whether it read real rows or mock data was unknown.
- **Invites:** Portal-originated (`/team`, `pending_invites`). SS5 shipped, but the full invite-acceptance test on production had not been run.
- **Not built as of Aug 18:** real file storage, messaging UI, invoice/balance/payment tables, AM views, `/register`, `/admin`, any integration with Internal, a real email provider.
- **Portal owned its own copies of:** CAD version history (`cad_versions` and children), per-version quote lines, and master data (metals, stone types, shapes, setting styles, product types). Open question: with Internal as source of truth, which of these should become read-only copies pushed from Internal? **Chandar proposes.**

---

## 6. Decisions needed from Arpit

1. **Timeline visibility.** Which Internal history events and note types show on the customer's timeline? Recommended default: only events explicitly marked customer-visible. Internal notes may contain internal chatter; no note should reach a customer by accident.
2. **Cancel eligibility.** At which stages can a customer request cancellation (Aug 18 Portal: draft and designing only)?
3. **Extra emails.** Should quote-ready, invoice-ready, or cancellation also trigger an email? (Not requested for Phase 1.)
4. **Phase 3 vs Phase 4 order.** This document puts the pricing engine in Phase 3 and accounting in Phase 4. Confirm.
5. **Registration form.** Self-registration is in Phase 1. Which fields are required (the old Portal required company, contact, phone, and address), and is Terms of Service acceptance needed at launch? No Terms document exists yet.

---

## 7. What Chandar's Claude session should report back before building

Short answers, with file or function names:

1. The Edge Function names, auth method (shared secret, JWT, etc.), and request/response shapes that exist today.
2. For each of P1-01 to P1-16: done, partial, or not started.
3. Where the customer-facing status mapping lives, and the exact labels sent to Portal.
4. The name of the review state for Portal submissions, and how pickup and the customer edit lock work.
5. File upload status on Portal and how files reach Internal.
6. Email provider status (Resend or other).
7. Whether the order detail page reads real data or `src/lib/mock/`.
8. Whether Portal still does any date math, and whether a designer field exists on version tables.
9. RLS status: `tax_id` and `account_notes` hidden from customer-side reads; `user_profiles.is_active = false` actually blocks access.
10. How a failed push or failed Portal-to-Internal call is handled today.
11. Whether Portal has a staging environment.
12. Current state of Internal's orders data shape (the orders schema rebuild's read path was not yet live as of Aug 20) and how it affects pushes and past-order backfill.
13. A refreshed `SCHEMA.md` and migration list for the Portal.
14. Registration: whether `/register` and a registration queue exist on either side, and what the Internal queue screen offers (match to existing, approve as new, reject).
15. Quotes and design versions: what Internal already sends (quote PDF, quote total, all renders, 3D model URL), and how files are transferred and stored.

---

## 8. Pre-launch gates and risks

- **Sync failures must be visible.** Recommendation: failed pushes retry automatically and show up in a staff-visible list in Internal, so an order never silently fails to arrive. Chandar proposes the design; this is not yet decided.
- **Plain-text passwords on Internal.** The Aug plan said to fix this before customer accounts exist. Status unknown; confirm before launch.
- **`order-images` bucket vulnerability.** Do not extend it (see P1-02).
- **Real email provider** in place (P1-13). Registration approval and invites both depend on it.
- **Public registration is an open door.** Bot and rate-limit protection in place, and no data visible to unapproved registrants (P1-14).
- **No duplicate customers from the registration queue.** Approving as new must use the existing customer-code and duplicate-name rules.
- **Invite flow tested end to end** on the environment customers will use, including acceptance (never run on production as of Aug 18).
- **Do not leak internal fields** to customers: raw status, designer names, party names, internal notes, `account_notes`, `tax_id`.
- **Two separate Supabase projects.** Never run Internal SQL against Portal's project or the reverse.
- **Test on staging first**, then production. Ship a complete changelog for the Phase 1 drop.

---

## 9. Later phases (proposed grouping; Arpit to confirm order of 3 and 4)

### Phase 2: immediately after launch
- **Chat integration** to remove the need for emails. Plan: Internal hosts the thread (AMs live in Internal), Portal polls every 10-20 seconds to start; true realtime across two Supabase projects needs federated auth and can come later.
- **Multiple users per company.** Roles and flags already exist; `/team` and invites exist from SS5. Decide the rules for who can see and place which orders.
- **My profile**, including requests for changes (email, shipping address, company name, and so on). Because Internal's Customer Master is the record, these are requests an AM approves and applies, not direct edits.
- **Compare versions** (side-by-side design versions; builds on P1-10).
- **Notification preferences**, including text. A `user_notification_preferences` table existed as of Aug 18 with no UI. An SMS provider has not been chosen.

### Phase 3: pricing engine on the website
- Internal already has a pricing engine (`computePricing`, stone and labor rates, metal rate, RJO discounts, Virtual Try-On, BTS pricing rules). The site must not become a second copy of those rules. Decide in Phase 3 whether the site calls Internal for a quote or ports the logic, and handle customer-specific pricing such as RJO. Price should be based on the order's own state, not recomputed from live customer flags at render time.

### Phase 4: accounting
- Balance, invoices list, payment history, and a payment portal (Stripe/ACH).
- **Internal remains the one ledger.** Portal never holds its own truth about what is paid. The Aug plan estimated payments alone at 3-4 sessions (webhooks, idempotency, partial payments, refunds, reconciliation).
- Arpit's later AR decisions in Internal (no customer-facing AR portal "any time soon") are consistent with this being last.

### Candidates not yet placed (my suggestions; Arpit to slot or drop)
- Two-factor authentication.
- A download-all-renders zip (the button was a stub; viewing all renders is in Phase 1).
- Tracking numbers on shipped orders (Arpit chose status and date only for Phase 1).
- Customer-facing quote expiry reminders.

---

## 10. Explicitly out of scope for Phase 1

Chat; multiple users per company; my profile and change requests; compare versions; notification preferences and text; pricing on the site; balances, payments, and any accounting view; tracking numbers; rollout planning.

---

## 11. Environments

| | Internal | Portal |
|---|---|---|
| Production | `https://diacointernal.netlify.app/`, Supabase `lufayphsvmdstuglrjsk` | `https://diaco-portal.vercel.app`, Supabase `rnwslatnbcrasjambabt` |
| Staging | `https://internal-staging.netlify.app/`, Supabase `oncbcrpujxybprrqhglp` | VERIFY whether one exists |
| Repo | single-file `index.html` (Vite split deferred, not cancelled) | `github.com/diaco-arpit/diaco-portal` |

Internal technical invariants that still apply to any SQL touching Internal's orders: update the eight mirror columns (`mfg_status`, `party`, `workflow`, `cad_status`, `ship_date`, `am`, `customer_name`, `style_no`) with any order-state change; filter `cancelled` with `jsonb_typeof(data->'cancelled') IS DISTINCT FROM 'object'` or use `status = 'active'`.

---

## 12. Sources

- Arpit, Oct 20, 2026 session (scope, phases, and decisions in §3, §4, §9).
- `PLAN_Internal_Portal_Integration.md` (Aug 16, 2026) and `ROADMAP_Drop22_onward.md` (Aug 19-20, 2026).
- Portal-side status report (Oct 20, 2026), based on Portal documents and chats up to Aug 18, 2026.
