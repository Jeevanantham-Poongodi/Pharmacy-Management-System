# Tasks: Flow Pages

**Input**: Design documents from `/specs/002-flow-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: included — SC-001 requires every Branch Inventory arrow to have an automated test, and
D-018 keeps FEFO, ledger and quarantine tests. Tests need not be seen to fail first (D-018).

**Organization**: grouped by user story (spec.md). US1–US5 are the five flows; US6 is the
dashboard, stock page and demo data.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task belongs to

## Path Conventions

Backend in `backend/app/…`, tests in `backend/tests/…`; frontend in `frontend/src/…`.

---

## Phase 1: Setup

- [X] T001 Add `react-router-dom` to `frontend/package.json` (npm install)
- [X] T002 [P] Create `backend/app/core/dates.py` with `hospital_today(cur, hospital_id)` returning today's date in the hospital's `time_zone` (from `public.hospitals`; constitution: single configured time zone)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: stock layer, case engine and the signed-in shell that every flow uses.

### Schema

- [X] T003 Add SQLAlchemy models `Location` (kind in `central_store, pharmacy, ward, ot, icu, quarantine_qc, quarantine_expiry, quarantine_recall`; `allocatable` false for every `quarantine_*` kind via check constraint; code unique per hospital), `Vendor` (name unique per hospital), `Batch` (batch_no unique per (hospital, item); `blocked` default false; `first_receipt_at`), `HospitalSetting` (PK hospital_id, key) to `backend/app/models.py`
- [X] T004 Add models `StockDocument` (doc_type in `opening, receipt, transfer, issue, dispense, return, return_to_vendor, write_off`; `posted_by` default `auth.uid()`), `LedgerLine` (qty numeric(12,2), `qty <> 0`), `StockBalance` (PK hospital_id, batch_id, location_id; `check (qty >= 0)`), `FlowCase` (flow 1–5, node, title, data jsonb, parent_case_id, closed, raised_by default `auth.uid()`), `FlowCaseLine` (qty_requested, qty_approved), `FlowEvent`, `NdpsRegister` to `backend/app/models.py`
- [X] T005 Generate `backend/alembic/versions/0002_flow_pages.py` with `alembic revision --autogenerate`, then add by hand: RLS enable + revoke from anon/authenticated + grants (select on all; insert on locations, vendors, batches, stock_documents, ledger_lines, flow_cases, flow_case_lines, flow_events, ndps_register, hospital_settings; update on batches, flow_cases, flow_case_lines, hospital_settings), member read policies via `app.current_hospital_ids()`, write policies via `app.has_permission(hospital_id, 'flows.write')`, append-only triggers (`app.forbid_update_delete`) on stock_documents, ledger_lines, flow_events, ndps_register, the security-definer `app.apply_ledger_line()` trigger that upserts stock_balances, the five permissions, admin grants for every hospital, and settings `expiry.alert_windows_days = [90,60,30]` and `allocation.block_on_expiry_date = true` for every hospital
- [X] T006 Apply with `alembic upgrade head` and confirm `alembic check` is clean (asks before writing to the shared database)

### Stock layer (FR-010–FR-013)

- [X] T007 [P] Create `backend/app/repositories/masters.py`: list locations, vendors, batches (with item name), get/create batch by (item, batch_no), get setting
- [X] T008 [P] Create `backend/app/repositories/stock.py`: insert document + lines, FEFO candidates query (allocatable locations, not blocked, `expiry_date > today` when setting `allocation.block_on_expiry_date` is true else `>=` (D-012), today in hospital time zone, order by expiry_date, first_receipt_at, id — D-005, D-012), balances query, batch trace query, ledger sum per batch-location
- [X] T009 Create `backend/app/domain/stock.py`: `post_document(cur, user, doc_type, lines, case_id, note, patient_ref, prescriber)` (sets `first_receipt_at`, writes audit), `allocate_fefo(cur, hospital_id, item_id, location_id, qty)` returning picks + shortfall (D-013), `transfer_fefo` helper; map `stock_balances` check violation to `409 INSUFFICIENT_STOCK`
- [X] T010 [P] Write `backend/tests/test_fefo.py`: D-005 scenarios 1–4, split across batches (D-013), expired-on-date excluded (D-012), blocked and quarantine excluded, shortfall reported
- [X] T011 [P] Write `backend/tests/test_stock_db.py` (integration): posting updates balances; negative balance refused and whole posting rolled back; ledger update/delete refused; balance equals ledger sum (SC-003)

### Case engine (FR-001–FR-005)

- [X] T012 Create `backend/app/flows/definitions.py`: `Node`, `Edge` dataclasses (approval, reason, guard, effect, inputs) and the five flow definitions transcribed from the spec's Branch Inventory with exact labels; helper `outgoing(flow, node)`. Set `approval=True` on the outcome edges of exactly these nodes (FR-004): `F1:"Committee approves?"`, `F1:"HOD approves requisition?"`, `F1:"Finance approves PO?"`, `F1:"Retrospective approval?"`, `F2:"Pharmacist reviews indent"`, `F4:"Write-off approved?"`. Set `reason=True` on the edges into exactly these nodes (FR-005): `F2:"Return to ward with reason"`, `F1:"Reject: notify requester, suggest formulary alternative"`, `F3:"Query to prescriber"`, `F4:"Investigate loss"`
- [X] T013 Create `backend/app/repositories/cases.py`: insert/get/list cases, lines, events, update node/closed/data/line approvals, children
- [X] T014 Create `backend/app/domain/flows.py`: `create_case` (start node must be a start of the flow), `available_actions` (outgoing edges filtered by guards), `take_action` (edge must be available → else `409 INVALID_TRANSITION`; closed → `409 CASE_CLOSED`; reason required → `422`; approval edge → `flows.approve` and raiser ≠ approver unless `DEMO_MODE` → `403 SELF_APPROVAL_FORBIDDEN`; run effect; insert event; audit; all in one transaction)
- [X] T015 Create `backend/app/domain/effects.py` with the effect registry and guard registry (empty entries filled per story)
- [X] T016 [P] Write `backend/tests/test_flow_definitions.py`: every Branch Inventory row exists as an edge with the exact label; every node reachable from a start; every non-end node has an outgoing edge; end nodes have none (SC-001)
- [X] T017 [P] Write `backend/tests/test_flow_engine.py`: invalid edge refused, closed case refused, missing reason refused, self-approval refused with demo mode off and allowed with it on

### API and shell

- [X] T018 Add schemas for FlowDefinition, CaseCreate, CaseSummary, CaseDetail, ActionRequest, Balance, BatchTrace, Dashboard, Location, Vendor, Batch to `backend/app/api/v1/schemas.py` per `contracts/openapi.yaml`
- [X] T019 Create `backend/app/api/v1/flows_routes.py` (`GET /flows`, `GET/POST /cases`, `GET /cases/{id}`, `POST /cases/{id}/actions`) and `backend/app/api/v1/stock_routes.py` (`GET /locations`, `/vendors`, `/batches`, `/stock/balances`, `/batches/{id}/trace`); include both routers in `backend/app/main.py`
- [X] T020 [P] Write `backend/tests/test_flows_api.py`: contract shape of `GET /flows`, `POST /cases`, `POST /cases/{id}/actions` errors use the envelope (fake transaction as in `test_items_api.py`)
- [X] T021 Add API types and calls (flows, cases, actions, balances, locations, vendors, batches, trace, dashboard, expiry scan) to `frontend/src/api/index.ts`
- [X] T022 Create `frontend/src/layout/AppShell.tsx` (MUI Drawer: Dashboard, Procurement, Ward indent, Dispensing, Expiry, Recall, Stock, Items; AppBar with user name and sign-out) and route table in `frontend/src/App.tsx` (`/`, `/flows/:flow`, `/cases/:id`, `/stock`, `/items`); move `Items` under the shell
- [X] T023 [P] Create `frontend/src/components/FlowMap.tsx` (flow nodes in order, current highlighted, visited marked, end nodes styled), `ActionPanel.tsx` (one button per available action labelled with outcome or target label; dialog for note/inputs), `CaseHistory.tsx` (antd Timeline), `LinesTable.tsx`
- [X] T024 Create `frontend/src/pages/FlowCases.tsx` (MUI table, filter by node, open/closed toggle, "New" button opening the flow's form) and `frontend/src/pages/CaseDetail.tsx` (FlowMap + details + lines + ActionPanel + history + linked cases)
- [X] T025 [P] Write `frontend/tests/actionPanel.test.tsx`: renders one button per action from a definition; reason dialog shown for reason edges

**Checkpoint**: engine, stock layer and generic screens work; flows have definitions but no stock effects.

---

## Phase 3: User Story 1 — Procurement (Priority: P1) 🎯 MVP

**Goal**: a requisition travels every Flow 1 path; GRN posts into QC quarantine and QC Pass into the central store.

**Independent Test**: quickstart rows 2–3.

- [X] T026 [US1] Add Flow 1 guards to `backend/app/domain/effects.py`: `F1:"Formulary item?"` Yes only if every line's item is `formulary`, No otherwise
- [X] T027 [US1] Add Flow 1 effects: GRN All OK (inputs per line: batch_no, expiry_date; create batch with case vendor; receipt into `quarantine_qc`), QC Pass (transfer QC → central store), QC Fail (return_to_vendor out of QC), Retrospective Approved (receipt into central store with batch inputs), Comparative statement / Pick alternate vendor (input vendor_id), HOD Approved (input approved quantities, partial allowed), Short at GRN (posts no stock; the full quantity is checked again when the balance arrives — spec gap U1)
- [X] T028 [P] [US1] Create `frontend/src/pages/newCase/RequisitionForm.tsx` (trigger: reorder level or department need; lines item + qty; separate "Emergency local purchase" start with vendor and lines)
- [X] T029 [US1] Add input rendering for batch/expiry/vendor/quantities in `frontend/src/components/ActionPanel.tsx`
- [X] T030 [US1] Write `backend/tests/test_flow1_db.py` (integration): walk formulary path to "Invoice matched, payment released"; non-formulary rejected path; HOD reject → resubmit and → drop; vendor Partial and Declined; GRN Short and Wrong or damaged → Reorder; QC Fail; emergency purchase approved and rejected; balances checked after GRN and QC

**Checkpoint**: Flow 1 demonstrable end to end.

---

## Phase 4: User Story 2 — Ward indent (Priority: P1)

**Goal**: indents issue by FEFO, refill from the central store through a linked Flow 1 case, and handle returns.

**Independent Test**: quickstart rows 4–5.

- [X] T031 [US2] Add Flow 2 guards: `F2:"Enough stock in pharmacy?"` Yes only if pharmacy FEFO covers approved quantities, No otherwise
- [X] T032 [US2] Add Flow 2 effects: Pharmacist Approved (input approved qty per line), No → create linked Flow 1 case for the shortfall (FR-021a), Stock received (transfer shortfall central → pharmacy by FEFO; refused while short), Issue (FEFO transfer pharmacy → ward location in case data; record batches on lines), Return slip (input qty per line), Accepted (transfer ward → pharmacy), Rejected (transfer ward → `quarantine_expiry` + linked Flow 4 case at `F4:"Expired: quarantine"`)
- [X] T033 [P] [US2] Create `frontend/src/pages/newCase/IndentForm.tsx` (ward/OT/ICU location select, lines)
- [X] T034 [US2] Write `backend/tests/test_flow2_db.py`: rejected → resubmit; FEFO issue picks earlier expiry and splits; shortfall path creates linked Flow 1 case and refill transfer; discrepancy path; return accepted and rejected (linked Flow 4 case exists)

**Checkpoint**: Flows 1–2 demonstrable.

---

## Phase 5: User Story 3 — Patient dispensing (Priority: P1)

**Goal**: IP and OP orders with query loop, NDPS dual sign-off, FEFO dispense and returns.

**Independent Test**: quickstart row 6.

- [X] T035 [US3] Add Flow 3 guards: `F3:"In stock?"` by pharmacy FEFO cover; `F3:"Narcotic or Schedule X?"` by item `controlled_class`; `F3:"IP or OP?"` by case `order_type`
- [X] T036 [US3] Add Flow 3 effects: Substitute (input choice substitute item or emergency purchase → linked Flow 1 case at `F1:"Emergency local purchase"`), NDPS entry (inputs sign-off 1 and 2 users; two different users unless `DEMO_MODE`; inserts `ndps_register` rows), Dispense (requires NDPS row for controlled items; FEFO `dispense` out of pharmacy with patient_ref and prescriber), Returned Accepted (`return` into pharmacy), Rejected (into `quarantine_expiry` + linked Flow 4 case)
- [X] T037 [P] [US3] Create `frontend/src/pages/newCase/MedicationOrderForm.tsx` (IP/OP, fictional patient reference, prescriber, lines)
- [X] T038 [US3] Write `backend/tests/test_flow3_db.py`: query → modified and → cancelled; not-in-stock substitute; narcotic requires NDPS before dispense; two sign-offs enforced with demo mode off; IP and OP paths each offered only for their type; returns accepted and rejected

**Checkpoint**: all P1 flows demonstrable.

---

## Phase 6: User Story 4 — Expiry management (Priority: P2)

**Goal**: daily scan creates expiry cases; vendor return, watch list, quarantine, write-off and disposal.

**Independent Test**: quickstart row 7.

- [X] T039 [US4] Create `backend/app/domain/expiry.py` `scan()`: windows from setting `expiry.alert_windows_days`; one case per batch-location with allocatable stock and expiry within the largest window, at `F4:"Within 90, 60 or 30 days?"`, `window_days` = smallest matching window; skip if an open Flow 4 case exists for that batch-location; add `POST /api/v1/expiry/scan` to `flows_routes.py`
- [X] T040 [US4] Add Flow 4 guards/effects: Within windows Yes/No by days to expiry; Move (input choice ward or vendor; ward → FEFO-free transfer of that batch to chosen ward, case moves on and only No is offered at vendor decision); Credit note (`return_to_vendor`); No, expired (transfer remaining to `quarantine_expiry`); Dispose (`write_off` from quarantine)
- [X] T041 [US4] Add "Run expiry scan" button to `frontend/src/pages/FlowCases.tsx` for flow 4 (antd message with created count)
- [X] T042 [US4] Write `backend/tests/test_flow4_db.py`: scan windows 20/50/80/200 days; rerun creates nothing; vendor accepts; watch list → used; expired → write-off rejected → investigate → resubmit → approved → disposed

---

## Phase 7: User Story 5 — Recall (Priority: P2)

**Goal**: recall a batch everywhere, trace patients, return to vendor.

**Independent Test**: quickstart row 8.

- [X] T043 [US5] Add Flow 5 guards/effects: Find affected (stores holdings snapshot in case data), Block and quarantine (set `blocked`; transfer every balance to `quarantine_recall`), Already dispensed? by dispense movements of the batch, Return to vendor (`return_to_vendor` from recall quarantine)
- [X] T044 [P] [US5] Create `frontend/src/pages/newCase/RecallForm.tsx` (batch select, source: regulator or vendor) and a trace panel on `CaseDetail.tsx` for Flow 5 (holdings and dispensed patients)
- [X] T045 [US5] Write `backend/tests/test_flow5_db.py`: holdings in three locations all moved to recall quarantine; blocked batch never allocated; dispensed path lists patients; not-dispensed path; stock leaves on return

---

## Phase 8: User Story 6 — Dashboard, stock page, demo data (Priority: P1)

**Goal**: landing overview, stock balances, and a demo data set covering every flow.

**Independent Test**: quickstart row 1; SC-005.

- [X] T046 [US6] Add `GET /api/v1/dashboard` (open cases per flow and node, near-expiry buckets by window, quarantine totals) to `backend/app/api/v1/stock_routes.py` with repository queries
- [X] T047 [P] [US6] Create `frontend/src/pages/Dashboard.tsx` (flow cards with counts per node linking to filtered lists, near-expiry and quarantine cards)
- [X] T048 [P] [US6] Create `frontend/src/pages/Stock.tsx` (MUI table by location, item, batch, expiry chip coloured by window, blocked tag, location filter)
- [X] T049 [US6] Add `demo-data` command to `backend/scripts/bootstrap.py`: skip if the hospital has locations; create ~30 items (2 narcotic, 1 Schedule X, 4 non-formulary), 4 vendors, 8 locations, batches with mixed expiries (≤30, ≤60, ≤90 days, one expired, rest > 1 year), opening stock document (D-017); then, acting as the demo user through `app.domain.flows`, create 3–5 cases per flow at different nodes including closed ones, an NDPS dispense and an active recall
- [X] T050 [US6] Run `bootstrap.py demo-data` against the shared database (asks first) and check SC-005 counts

---

## Phase 9: Polish & Cross-Cutting

- [X] T051 Run `pytest`, `ruff check`, `alembic check`, `npm run lint`, `npm test`, `npm run build`; fix failures
- [X] T052 Walk quickstart rows 1–9 in Chrome; check console for errors
- [X] T053 Commit on `002-flow-pages` referencing 002 and task IDs and push (no PR, as requested)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T003–T025) → story phases.
- US1, US2, US3 depend only on Phase 2; US2's refill (T032) and US3's emergency purchase (T036) create Flow 1 cases, which need only Flow 1's definitions (Phase 2), not US1's effects.
- US4 and US5 depend on Phase 2; their tests use dispensing (US3) data for recall tracing.
- US6 demo data (T049) needs all flows' effects (US1–US5).
- Shared files: `effects.py`, `ActionPanel.tsx` and `CaseDetail.tsx` are touched by several stories — do those tasks in sequence.

## Parallel Example: Phase 2

```text
T007 repositories/masters.py   T008 repositories/stock.py
T010 tests/test_fefo.py        T011 tests/test_stock_db.py
T016 tests/test_flow_definitions.py   T017 tests/test_flow_engine.py
T023 components/*              T025 frontend/tests/actionPanel.test.tsx
```

## Implementation Strategy

### MVP first

Phase 1 + 2 + US1 (procurement) gives a working flow with stock entering the central store.

### Incremental delivery

Then US2 and US3 (all P1 flows), US4 and US5, and finally US6 so demo data exercises every
flow's effects. Each story ends with its integration test passing.
