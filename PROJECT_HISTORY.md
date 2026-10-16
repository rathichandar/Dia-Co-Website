# Dia-Co Portal — Project History

**Companion to PROJECT_CONTEXT.md.** Contains backlog, lessons learned, and session log. NOT loaded by default into Claude Code context — reference explicitly when needed.

**When to read this doc:**
- Planning a new phase: check §20 backlog for relevant items
- Hitting a familiar problem: check §21 for prior lessons
- Need context on prior decisions: check §23 session log

---

## 20. First Ship + Phase 3+ BACKLOG

### Phase 2D — AM portal + initial sync

- AM authentication
- AM dashboard
- AM customer view
- AM order detail variant
- AM-Customer assignment management
- Order history + engraving + messaging access
- Internal-only fields for AMs
- **First sync work** with existing software via existing endpoints (per `EXISTING_SYSTEMS_REFERENCE.md` §9)

### Phase 2E — Customer actions + AR/payment

- Approve CAD, request mods, cancel
- Priority Rush request flow
- Real-time messaging (Supabase Realtime)
- Order-level threads + customer-level threads
- AM-entered quote display
- Customer AR view (account summary, invoices, payment history)
- Payment portal (Stripe/ACH, auto-apply to specific invoices)
- AR employee login + dashboard + thread participation
- **STANDALONE — no AR/payment sync with internal software in first ship**
- Try-but-don't-block: request sync API from existing dev team

### First Ship execution

- Customer migration mechanics (auto-migrate vs. fresh registration — TBD)
- In-flight order migration (forklift import from old portal)
- Historical order data migration (TBD — full history vs. last N months)
- Old portal URL strategy (redirects vs. shutdown vs. grace period)
- Parallel-run vs. hard cutover (TBD — risk discussion needed)
- Customer comms blitz (~350 customers need to be told about the new portal)

### Phase 3.0 — CAD designer migration

- Designer queue + assignment + point values
- File upload (Cloudflare R2 for 3dm/stl, Supabase Storage for renders/thumbnails)
- Designer efficiency reporting
- Stock design flow (with live pricing sync from internal software's pricing master)
- Mumbai upload speed FIX (cloud region in India = faster than current firewall-to-LA setup)
- Thumbnail generation for stock designs (fixes existing performance issue)

### Phase 3.1 — Automated pricing engine

- Replaces AM-entered manual quotes
- Metal weight × spot price
- Stones master integration (pricing per shape/size/color/clarity)
- Labor master integration (per setting style)
- Margin + finishing
- Real-time updates as CAD changes
- AM oversight but mostly automated
- Likely the largest single phase after first ship

### Phase 3.2 — Accounting full migration

- Invoice creation in new portal (AM-side)
- AR employee workflow: bank deposits, payment application for external payments, statements, discounts, returns
- Customer statements
- AR reporting

### Phase 3.3 — Production + QC + job cards

- Production status changes in new portal
- Barcode scan in/out for jewelers
- Workshop manager assigning jobs in software (vs. physical bags)
- Workshop efficiency tracking (replaces current Google Sheet)
- Job card printing
- QC checklists
- Internet redundancy considerations

### Phase 3.4 — AP migration (long-term, possibly never)

- Vendor bills
- Per-order profit tracking
- Vendor master
- Payable workflow

### Cross-phase backlog (carried from prior sessions)

**Architecture / pattern:**
- Drop `metal_finish.brushed` enum value if confirmed permanently hidden in UI
- Refactor `setFields` side effects out of updaters
- Cert multi-select panel viewport-edge clipping
- Toast UI system (deferred indefinitely)
- Real Supabase Storage setup (currently stubbed for engraving_logo_url, attachments)
- Schema drift one-time audit — diff live remote schema against recorded migration set
- Verify `orders.updated_at` trigger exists
- `sub_status='awaiting_design'` on submit — verify with existing software team when integration happens
- `CancelConfirmDialog` is dead code (cleanup PR)
- Detail page type signature: `certification: string[] | null` not `string`
- Stale-data audit on `customStoneTypeName` when topType switches Other → Diamond

**Behavior:**
- Cron job to actually delete drafts past 90 days
- Concurrent edit detection across tabs
- Step 6.5 — order_history_events on submit + other lifecycle events
- Unit-test `submitValidation.ts` in isolation
- Revisit incomplete-row submit gating if customer feedback shows friction

---


---

## 21. Open items + lessons (Session 14 additions)

**Session 14 strategic locks:**
1. **6-role model** — Sales Rep / Customer Admin / Accounting / AM / AR / Super Admin. Locked. Use verbatim.
2. **Capability flag pattern (Option 2)** — Role + boolean flags on user_profiles. Locked.
3. **Phase plan reframe** — Phase 2 split into 2C / 2D / 2E shipping together as "First Ship". Phase 3 split into 3.0 (CAD) / 3.1 (pricing) / 3.2 (accounting) / 3.3 (production+QC) / 3.4 (AP, maybe never). Locked.
4. **AR/payment standalone for first ship** — no sync with internal software. Customers paying externally won't see those payments reflected. Communicated to customers explicitly. Locked.
5. **CAD migration deferred to Phase 3.0** — Option A locked. Not in first ship.
6. **Sync strategy:** Build off existing endpoints only. Don't depend on new APIs from existing dev team. Request precisely-specced new sync APIs as bonus, don't block. Locked.
7. **20 hrs/week commitment** — Arpit's sustained pace target.
8. **3-4 month first-ship timeline** — realistic at 20 hrs/week. Could be 2 months if Arpit pushes harder. Could slip to 5 if life intervenes.
9. **Messaging architecture:** Order-level threads (one per order, AM + customer-side users) + customer-level threads (one per customer, all users on that account including AR). Internal notes feature deferred from first ship.
10. **AR dashboard scope:** AR sees all customers (one AR person for now). Sees portal-native payments only. Participates in customer-level message threads. Read-only on order-level threads (for context). No payment application / bank deposits / statements (stays in internal software for now).

**From prior sessions (still relevant):**
1. Every new SECURITY DEFINER function gets explicit REVOKE FROM PUBLIC in the same migration
2. Pre-step conversation pattern is essential
3. Toast UI still deferred
4. Real Supabase Storage still stubbed
5. `MAX_METAL_ROWS = 4`, `MAX_CENTER_STONE_ROWS = 3`, `MAX_ACCENT_STONE_ROWS = 5` are UI-only — no backend enforcement
6. `metal_finish.brushed` is an orphan enum value
7. Schema drift on `order_accent_stones` (one-time audit recommended)
8. Section 06 quality field architecture: new columns on order_accent_stones (rather than reusing center_stones columns) was the right call
9. Center stone "Other" master row taxonomy mismatch (resume hydration handles this)
10. Autosave naturally suppressed on resume — no explicit flag needed
11. Always read migration files (not live DB) when answering "does column X exist"

---


---

## 23. Session log (most recent first)

### Session 14 — May 25, 2026 (Strategic reframe, no code shipped)

**Purpose:** Strategic planning session. Phase 2B was complete, Phase 2C kickoff was imminent. Discussion revealed significant gaps in prior planning's understanding of how Dia-Co actually operates.

**Major outcomes:**

1. **Role model expanded from 4 to 6 roles.** Added Accounting (customer-side) and AR (Dia-Co side). Captured the full set of users. Locked terminology to be used verbatim throughout the project.

2. **Phase plan completely rewritten.** Old plan was Phase 2C → 2D → 2E → 3.1/3.2/3.3. New plan is Phase 2C → 2D → 2E as the "First Ship" (shipping together), then Phase 3.0 (CAD) / 3.1 (pricing) / 3.2 (accounting full) / 3.3 (production+QC) / 3.4 (AP). The new portal is now framed as the EVENTUAL entire Dia-Co operating system, not just a customer portal replacement.

3. **Existing systems deep-dive.** Arpit walked through everything the existing customer web portal AND the existing internal order management software do — across every role, every workflow, every data domain. Captured in new doc `EXISTING_SYSTEMS_REFERENCE.md`. This is the single most comprehensive reference for the existing systems in the project.

4. **Sync strategy decided.** Build off existing API endpoints only. Don't depend on new APIs from existing dev team. AR/payment is STANDALONE in first ship (no sync). Try-but-don't-block on requesting new sync APIs from existing dev team. Endpoint audit pending in next session — Arpit will dig into the existing web portal codebase to find them.

5. **CAD migration deferred (Option A locked).** Not in first ship. Phase 3.0 post-first-ship. Cloud storage in India region will be FASTER than current firewall-to-LA setup once we migrate (real productivity gain when it lands).

6. **Capability flag pattern locked (Option 2).** Role + boolean flags on user_profiles. Customer Admin and Super Admin can override flags for users in their scope. Defaults table locked.

7. **Two registration paths.** Both self-register (with approval queue) and Super Admin-initiated invite. Both supported in Phase 2C.

8. **20 hrs/week committed.** First-ship timeline estimated 3-4 months at this pace.

9. **Heritage Fine Jewelers test setup.** Arpit's dummy personal email becomes the live test account for the existing hardcoded customer.

10. **AR dashboard scope locked for first ship.** AR logs in, sees all customers, portal-native payments only, participates in customer-level threads. No payment application / bank deposits / statements in first ship — those stay in internal software.

11. **Messaging architecture locked.** Order-level threads (existing concept) + new customer-level threads. AR participates in customer-level threads.

12. **Efficiency adjustments locked.** Bulk-approve narrow safe operations, parallelize the two Claudes, don't re-derive locked decisions. Still strict on `supabase db *` and commits.

**No code shipped this session.** All work was strategic conversation + this doc + EXISTING_SYSTEMS_REFERENCE.md.

**Hiccups / lessons:**

1. **Claude (this chat) initially had the role model wrong** — 4 roles, missing Accounting. Caught when Arpit said the actual customer-side has Sales Rep + Customer Admin + Accounting. Lesson: don't assume prior PROJECT_CONTEXT.md fully captures the role model when it was written before all the strategic conversation happened.

2. **Claude initially under-scoped the existing internal software's surface area.** PROJECT_CONTEXT.md previously implied "internal software runs production, that's about it." After Arpit's walkthrough, it became clear the internal software runs ~90% of the business (customer master, CAD workflow, pricing master, AR, AP, reporting, vendor master, etc.). Big correction. Lesson: when planning a phase that interacts with existing systems, get a comprehensive map of what the existing systems do BEFORE writing the phase plan, not after.

3. **Claude initially proposed "Phase 2C.5 = build sync."** Wrong framing. Sync is INFRASTRUCTURE that every phase from 2D forward depends on, not a discrete phase. Phase 2D will include "initial sync work using existing endpoints." Later phases extend sync coverage as they migrate domains.

4. **Claude initially estimated 13-18 weeks for the remaining roadmap.** Wildly wrong — that was based on a much smaller scoping. Real estimate: ~3-4 months for first ship (Phase 2C + 2D + 2E), then 12-24 months for the full Phase 3 migration of internal software workflows. Multi-year project.

5. **Existing dev team trust gap surfaced.** Arpit can engage them but doesn't trust them to build new APIs reliably on a tight timeline. Sync strategy reshaped around this — use what exists, don't depend on new work.

6. **AR/payment standalone tradeoff accepted.** Means customers will see inconsistent balances in the new portal vs. reality if they pay externally. Arpit accepted this; we tell customers directly. Long-term resolved when internal software's AR module retires in Phase 3.2.

**Decisions locked Session 14:**

[See §21 list above]

**Next session:** Phase 2C kickoff. Fresh Claude Code session. Read this doc + EXISTING_SYSTEMS_REFERENCE.md end-to-end first. Then pre-step conversation for Sub-session 1 (auth foundation + role model migrations). Also: API endpoint audit (Arpit digs into existing web portal codebase to find current sync endpoints).

### Sessions 1-13

[Preserved in prior context. Phase 1 + Phase 2A + Phase 2B shipped.]

---


---

*End of project history. Reference as needed.*
