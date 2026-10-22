# Feature Specification: Flow Pages

**Feature Branch**: `002-flow-pages` (created by hand per D-008)

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Feature 002 — Flow pages. Screens and backend support for all five
flows in docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf, in one feature under decision D-018
(demo scope). Every decision node and outcome in the diagram must exist as a case state or
transition; one user story per flow. Built on a simplified Foundation stock layer. Includes a
dashboard, a stock balance page and a demo-data seed with fictional data. Do not invent rules
the diagram does not show — record gaps."

## Sources and Scope

**Business-process source**: `docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf` (D-010). Nodes are
cited as `F<flow>:"<exact label>"`.

**Approved decisions relied on**: D-001 (browser data only through the backend), D-005 (FEFO
order), D-006 (one hospital), D-010 (diagram is the only process source), D-012 temporary rule
(a batch is not allocatable on or after its expiry date), D-013 (allocation splits across
batches), D-017 (opening stock through an opening-stock document), **D-018 (demo scope)**.

**D-018 relaxations that apply to this feature**: no idempotency keys on postings; no concurrency
design beyond the non-negative balance check; tests cover every implemented diagram branch but
need not be seen to fail first; with demo mode on, the raiser may approve their own case and one
user may give both NDPS sign-offs; demo data is fictional.

**Relation to Foundation (001)**: this feature delivers a simplified subset of Foundation's
stock capabilities (locations, vendors, batches, stock documents, append-only ledger, FEFO
allocation) because every flow needs them. It does not deliver Foundation's idempotency,
configurable approval rules, settings history or stock take.

**Out of scope** (not shown in the diagram, or excluded by D-018): prices, tax, invoice amounts
and payment processing; bill amounts, TPA claims and payment collection; RFQ and quote
documents beyond recording the selected vendor; vendor-facing screens; notifications outside
the application; cold-chain sensors and barcode scanning; patient records beyond a fictional
reference and IP/OP type; stock take; multi-hospital use.

## Branch Inventory *(source of truth for states and transitions)*

Every node below exists in the system as a case state, and every arrow as an action from that
state with the diagram's outcome label. "→" is an arrow; text in quotes after a state is the
outcome label on the arrow.

### Flow 1 — Procurement

| From | Outcome | To |
| --- | --- | --- |
| `F1:"Stock below reorder level or department need"` | — | `F1:"Store raises purchase requisition"` |
| `F1:"Store raises purchase requisition"` | — | `F1:"Formulary item?"` |
| `F1:"Formulary item?"` | Yes | `F1:"HOD approves requisition?"` |
| `F1:"Formulary item?"` | No | `F1:"Drug committee review"` |
| `F1:"Drug committee review"` | — | `F1:"Committee approves?"` |
| `F1:"Committee approves?"` | Approved | `F1:"HOD approves requisition?"` |
| `F1:"Committee approves?"` | Rejected | `F1:"Reject: notify requester, suggest formulary alternative"` |
| `F1:"Reject: notify requester, suggest formulary alternative"` | — | `F1:"Requisition closed"` (end) |
| `F1:"HOD approves requisition?"` | Approved | `F1:"Rate contract exists?"` |
| `F1:"HOD approves requisition?"` | Rejected | `F1:"Revise requisition"` |
| `F1:"Revise requisition"` | Resubmit | `F1:"HOD approves requisition?"` |
| `F1:"Revise requisition"` | Drop | `F1:"Requisition closed"` (end) |
| `F1:"Rate contract exists?"` | Yes | `F1:"Create PO"` |
| `F1:"Rate contract exists?"` | No | `F1:"RFQ to vendors, collect quotes"` |
| `F1:"RFQ to vendors, collect quotes"` | — | `F1:"Comparative statement, select vendor"` |
| `F1:"Comparative statement, select vendor"` | — | `F1:"Create PO"` |
| `F1:"Create PO"` | — | `F1:"Finance approves PO?"` |
| `F1:"Finance approves PO?"` | Approved | `F1:"Send PO to vendor"` |
| `F1:"Finance approves PO?"` | Rejected | `F1:"Revise PO"` |
| `F1:"Revise PO"` | Resubmit | `F1:"Finance approves PO?"` |
| `F1:"Send PO to vendor"` | — | `F1:"Vendor response"` |
| `F1:"Vendor response"` | Confirmed | `F1:"Goods arrive with invoice"` |
| `F1:"Vendor response"` | Partial | `F1:"Backorder balance quantity"` |
| `F1:"Vendor response"` | Declined | `F1:"Pick alternate vendor"` |
| `F1:"Pick alternate vendor"` | — | `F1:"Comparative statement, select vendor"` |
| `F1:"Backorder balance quantity"` | Balance arrives later | `F1:"Goods arrive with invoice"` |
| `F1:"Goods arrive with invoice"` | — | `F1:"GRN check: qty, batch, expiry, price"` |
| `F1:"GRN check: qty, batch, expiry, price"` | All OK | `F1:"Quarantine for QC"` |
| `F1:"GRN check: qty, batch, expiry, price"` | Short | `F1:"Backorder balance quantity"` |
| `F1:"GRN check: qty, batch, expiry, price"` | Wrong or damaged | `F1:"Return to vendor, debit note"` |
| `F1:"Return to vendor, debit note"` | Reorder | `F1:"Create PO"` |
| `F1:"Quarantine for QC"` | — | `F1:"QC passed?"` |
| `F1:"QC passed?"` | Pass | `F1:"Stock in central store"` |
| `F1:"QC passed?"` | Fail | `F1:"Return to vendor, debit note"` |
| `F1:"Stock in central store"` | — | `F1:"Invoice matched, payment released"` (end) |
| `F1:"Emergency local purchase"` | — | `F1:"Retrospective approval?"` |
| `F1:"Retrospective approval?"` | Approved | `F1:"Stock in central store"` |
| `F1:"Retrospective approval?"` | Rejected | `F1:"Escalate to audit"` (end) |

### Flow 2 — Ward indent

| From | Outcome | To |
| --- | --- | --- |
| `F2:"Ward, OT or ICU needs stock"` | — | `F2:"Ward raises indent to pharmacy"` |
| `F2:"Ward raises indent to pharmacy"` | — | `F2:"Pharmacist reviews indent"` |
| `F2:"Pharmacist reviews indent"` | Rejected | `F2:"Return to ward with reason"` |
| `F2:"Return to ward with reason"` | Revise and resubmit | `F2:"Ward raises indent to pharmacy"` |
| `F2:"Pharmacist reviews indent"` | Approved (full or partial) | `F2:"Enough stock in pharmacy?"` |
| `F2:"Enough stock in pharmacy?"` | Yes | `F2:"Issue approved quantity, earliest expiry first"` |
| `F2:"Enough stock in pharmacy?"` | No | `F2:"Raise requisition to central store"` |
| `F2:"Raise requisition to central store"` | Stock received (via Flow 1) | `F2:"Issue approved quantity, earliest expiry first"` |
| `F2:"Issue approved quantity, earliest expiry first"` | — | `F2:"Ward receipt matches issue?"` |
| `F2:"Ward receipt matches issue?"` | Yes | `F2:"Ward stock updated"` |
| `F2:"Ward receipt matches issue?"` | No | `F2:"Raise discrepancy and reconcile"` |
| `F2:"Raise discrepancy and reconcile"` | — | `F2:"Ward stock updated"` |
| `F2:"Ward stock updated"` | — | `F2:"Unused or excess ward stock?"` |
| `F2:"Unused or excess ward stock?"` | No | `F2:"Indent closed"` (end) |
| `F2:"Unused or excess ward stock?"` | Yes | `F2:"Return to pharmacy with return slip"` |
| `F2:"Return to pharmacy with return slip"` | — | `F2:"Sealed, unexpired, cold chain OK?"` |
| `F2:"Sealed, unexpired, cold chain OK?"` | Accepted | `F2:"Restock in pharmacy, credit ward"` |
| `F2:"Sealed, unexpired, cold chain OK?"` | Rejected | `F2:"Quarantine for disposal (Flow 4)"` |
| `F2:"Restock in pharmacy, credit ward"` | — | `F2:"Indent closed"` (end) |
| `F2:"Quarantine for disposal (Flow 4)"` | — | `F2:"Indent closed"` (end) |

### Flow 3 — Patient dispensing

| From | Outcome | To |
| --- | --- | --- |
| `F3:"Doctor writes medication order, IP or OP"` | — | `F3:"Pharmacist verification"` |
| `F3:"Pharmacist verification"` | Rejected or unclear | `F3:"Query to prescriber"` |
| `F3:"Query to prescriber"` | — | `F3:"Prescriber response"` |
| `F3:"Prescriber response"` | Order modified | `F3:"Pharmacist verification"` |
| `F3:"Prescriber response"` | Order cancelled | `F3:"Order closed"` (end) |
| `F3:"Pharmacist verification"` | Approved | `F3:"In stock?"` |
| `F3:"In stock?"` | Yes | `F3:"Narcotic or Schedule X?"` |
| `F3:"In stock?"` | No | `F3:"Substitute with prescriber consent or emergency purchase (Flow 1)"` |
| `F3:"Substitute with prescriber consent or emergency purchase (Flow 1)"` | — | `F3:"Narcotic or Schedule X?"` |
| `F3:"Narcotic or Schedule X?"` | Yes | `F3:"NDPS register entry, dual sign-off"` |
| `F3:"Narcotic or Schedule X?"` | No | `F3:"Dispense from earliest-expiry batch"` |
| `F3:"NDPS register entry, dual sign-off"` | — | `F3:"Dispense from earliest-expiry batch"` |
| `F3:"Dispense from earliest-expiry batch"` | — | `F3:"IP or OP?"` |
| `F3:"IP or OP?"` | IP | `F3:"Charge to patient bill or TPA"` |
| `F3:"Charge to patient bill or TPA"` | — | `F3:"Nurse administers"` |
| `F3:"Nurse administers"` | — | `F3:"Unused medicine returned?"` |
| `F3:"IP or OP?"` | OP | `F3:"Bill at counter (cash / insurance)"` |
| `F3:"Bill at counter (cash / insurance)"` | — | `F3:"Counsel patient, label and hand over"` |
| `F3:"Counsel patient, label and hand over"` | — | `F3:"Unused medicine returned?"` |
| `F3:"Unused medicine returned?"` | No | `F3:"Order closed"` (end) |
| `F3:"Unused medicine returned?"` | Yes | `F3:"Sealed, unexpired, cold chain OK?"` |
| `F3:"Sealed, unexpired, cold chain OK?"` | Accepted | `F3:"Restock and credit patient"` |
| `F3:"Sealed, unexpired, cold chain OK?"` | Rejected | `F3:"Quarantine for disposal (Flow 4)"` |
| `F3:"Restock and credit patient"` | — | `F3:"Order closed"` (end) |
| `F3:"Quarantine for disposal (Flow 4)"` | — | `F3:"Order closed"` (end) |

### Flow 4 — Expiry management

| From | Outcome | To |
| --- | --- | --- |
| `F4:"Daily expiry scan"` | — | `F4:"Within 90, 60 or 30 days?"` |
| `F4:"Within 90, 60 or 30 days?"` | No | `F4:"Stock records updated"` (end) |
| `F4:"Within 90, 60 or 30 days?"` | Yes | `F4:"Move to high-use ward or offer return to vendor"` |
| `F4:"Move to high-use ward or offer return to vendor"` | — | `F4:"Vendor accepts return?"` |
| `F4:"Vendor accepts return?"` | Yes | `F4:"Credit note received"` |
| `F4:"Credit note received"` | — | `F4:"Stock records updated"` (end) |
| `F4:"Vendor accepts return?"` | No | `F4:"Keep on near-expiry watch list, flag for FEFO priority issue"` |
| `F4:"Keep on near-expiry watch list, flag for FEFO priority issue"` | — | `F4:"Used before expiry date?"` |
| `F4:"Used before expiry date?"` | Yes | `F4:"Stock records updated"` (end) |
| `F4:"Used before expiry date?"` | No, expired | `F4:"Expired: quarantine"` |
| `F4:"Expired: quarantine"` | — | `F4:"Write-off approved?"` |
| `F4:"Write-off approved?"` | Approved | `F4:"Dispose via biomedical waste vendor"` |
| `F4:"Dispose via biomedical waste vendor"` | — | `F4:"Stock records updated"` (end) |
| `F4:"Write-off approved?"` | Rejected | `F4:"Investigate loss"` |
| `F4:"Investigate loss"` | Resubmit | `F4:"Write-off approved?"` |

### Flow 5 — Recall

| From | Outcome | To |
| --- | --- | --- |
| `F5:"Recall notice from regulator or vendor"` | — | `F5:"Find affected batches in all stores and wards"` |
| `F5:"Find affected batches in all stores and wards"` | — | `F5:"Block and quarantine batches"` |
| `F5:"Block and quarantine batches"` | — | `F5:"Already dispensed to patients?"` |
| `F5:"Already dispensed to patients?"` | Yes | `F5:"Inform prescribers, trace patients"` |
| `F5:"Inform prescribers, trace patients"` | — | `F5:"Return to vendor for credit or replacement"` |
| `F5:"Already dispensed to patients?"` | No | `F5:"Return to vendor for credit or replacement"` |
| `F5:"Return to vendor for credit or replacement"` | — | `F5:"Stock records updated"` (end) |

## Clarifications

### Session 2026-10-22

- Q: How faithful must this feature be to the constitution? → A: Demo scope, recorded as D-018.
- Q: How do approvals work with a single demo account? → A: With demo mode on, the raiser may
  approve their own case and one user may give both NDPS sign-offs (D-018).
- Q: How does stock rejected at a ward or patient return ("Quarantine for disposal (Flow 4)")
  enter Flow 4? → A: It moves to expiry quarantine and a linked Flow 4 case is opened at
  `F4:"Expired: quarantine"`, so it goes on to write-off approval and disposal.
- Q: How does stock reach the pharmacy after `F2:"Raise requisition to central store"`? → A: The
  action opens a linked Flow 1 case; the Stock received outcome transfers the shortfall from the
  central store to the pharmacy by FEFO, and is refused while the central store is short.
- Q: How is `F4:"Move to high-use ward or offer return to vendor"` recorded? → A: The user picks
  one: move to a chosen ward (stock transfers there; the vendor is not asked, so
  `F4:"Vendor accepts return?"` is answered No) or offer return to vendor (Yes/No as in the
  diagram).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Procurement: purchase requisition to central store (Priority: P1)

A store user raises a purchase requisition for items that are low or needed by a department.
The case moves through formulary check, drug committee (non-formulary only), HOD approval,
rate contract or RFQ, PO creation, Finance approval, vendor response, goods receipt (GRN check),
QC quarantine and QC result, until stock is in the central store and the invoice is matched.
Emergency local purchases go through retrospective approval.

**Why this priority**: it is the only way stock enters the hospital (D-017 aside); flows 2 and
3 consume the stock it brings in.

**Independent Test**: raise a requisition for a formulary item, take it through every step to
`F1:"Invoice matched, payment released"`, and see the received batch appear in the central
store's stock.

**Acceptance Scenarios**:

1. **Given** a requisition for a non-formulary item, **When** the user answers
   `F1:"Formulary item?"` with No, **Then** the case goes to `F1:"Drug committee review"`.
2. **Given** a case at `F1:"Committee approves?"`, **When** the outcome is Rejected, **Then** the
   case goes to `F1:"Reject: notify requester, suggest formulary alternative"` and can only be
   closed.
3. **Given** a case at `F1:"HOD approves requisition?"`, **When** it is rejected and then
   resubmitted, **Then** it returns to `F1:"HOD approves requisition?"`; when dropped, it closes.
4. **Given** a case at `F1:"GRN check: qty, batch, expiry, price"` with batch and expiry
   entered, **When** the outcome is All OK, **Then** the received quantity is posted into the QC
   quarantine location and is not allocatable.
5. **Given** a case at `F1:"QC passed?"`, **When** the outcome is Pass, **Then** the stock moves
   from QC quarantine to the central store; when Fail, it goes to
   `F1:"Return to vendor, debit note"` and leaves stock.
6. **Given** an emergency local purchase, **When** retrospective approval is Rejected, **Then**
   the case ends at `F1:"Escalate to audit"`.

---

### User Story 2 - Ward indent: pharmacy to ward, OT or ICU (Priority: P1)

A ward, OT or ICU raises an indent to the pharmacy. The pharmacist reviews it (approve in full
or in part, or return with a reason). If the pharmacy has enough stock, the approved quantity
is issued earliest-expiry-first; otherwise a requisition is raised to the central store. The
ward confirms receipt, reports discrepancies, and may return unused stock, which is checked and
either restocked or quarantined for disposal.

**Why this priority**: it is the main internal stock movement and shows FEFO allocation.

**Independent Test**: raise an indent for an item held in two batches with different expiry
dates; approve and issue it; confirm the earlier-expiry batch is issued first and the ward's
stock increases.

**Acceptance Scenarios**:

1. **Given** an indent at `F2:"Pharmacist reviews indent"`, **When** it is Rejected with a reason,
   **Then** it goes to `F2:"Return to ward with reason"` and can be revised and resubmitted.
2. **Given** an approved indent and enough pharmacy stock, **When** it is issued, **Then** batches
   are taken in FEFO order (D-005), split across batches when needed (D-013), and never from a
   batch on or after its expiry date (D-012 temporary rule) or a quarantine location.
3. **Given** an approved indent and not enough stock, **When** the user answers
   `F2:"Enough stock in pharmacy?"` with No, **Then** a Flow 1 requisition is raised and linked.
4. **Given** returned ward stock at `F2:"Sealed, unexpired, cold chain OK?"`, **When** it is
   Accepted, **Then** it moves back to the pharmacy; when Rejected, it moves to the expiry
   quarantine location.

---

### User Story 3 - Patient dispensing: IP and OP orders (Priority: P1)

A prescriber's medication order (IP or OP) is verified by the pharmacist, queried if unclear,
checked for stock (substitute or emergency purchase if missing), routed through the NDPS
register with dual sign-off for narcotic or Schedule X items, dispensed earliest-expiry-first,
then charged to the IP bill and administered, or billed at the counter and handed over with
counselling for OP. Unused returned medicine is checked and restocked or quarantined.

**Why this priority**: it is the patient-facing flow and the NDPS control.

**Independent Test**: create an OP order for a narcotic item; verify it, record the NDPS entry
with two sign-offs, dispense, bill and close; confirm the pharmacy stock falls by the dispensed
quantity from the earliest-expiry batch.

**Acceptance Scenarios**:

1. **Given** an order at `F3:"Pharmacist verification"`, **When** it is Rejected or unclear,
   **Then** it goes to `F3:"Query to prescriber"`; an Order modified response returns it to
   verification and Order cancelled closes it.
2. **Given** an order for a narcotic or Schedule X item, **When** it reaches
   `F3:"Narcotic or Schedule X?"`, **Then** it cannot be dispensed until an NDPS register entry
   with two sign-offs is recorded.
3. **Given** an order for a non-controlled item, **When** it reaches
   `F3:"Narcotic or Schedule X?"`, **Then** the No outcome goes straight to dispensing.
4. **Given** a dispensed IP order, **When** the user answers `F3:"IP or OP?"`, **Then** only the
   IP path (bill, nurse administers) is offered; an OP order only offers the OP path.

---

### User Story 4 - Expiry management (Priority: P2)

A user runs the daily expiry scan. Each batch-location with stock whose expiry falls within the
configured alert windows (90, 60 or 30 days) gets an expiry case. The user moves it to a
high-use ward or offers it back to the vendor; if the vendor accepts, a credit note closes the
case; otherwise the batch stays on the near-expiry watch list. If it expires unused, it goes to
expired quarantine and through write-off approval (with investigate-loss loop) to disposal.

**Why this priority**: it depends on stock existing; it is valuable but not on the critical
path of receiving and issuing stock.

**Independent Test**: with a batch expiring in 20 days, run the scan; an expiry case appears in
the 30-day window; take it through vendor return and see stock leave.

**Acceptance Scenarios**:

1. **Given** batches expiring in 20, 50, 80 and 200 days, **When** the scan runs, **Then** cases
   are created for the first three only, each showing its window (30, 60, 90).
2. **Given** a case at `F4:"Used before expiry date?"`, **When** the outcome is No, expired,
   **Then** the remaining quantity moves to the expiry quarantine location.
3. **Given** a case at `F4:"Write-off approved?"`, **When** Rejected, **Then** it goes to
   `F4:"Investigate loss"` and can be resubmitted; when Approved, disposal writes the stock off.
4. **Given** the scan has already created an open case for a batch-location, **When** it runs
   again, **Then** no duplicate case is created.

---

### User Story 5 - Recall (Priority: P2)

A recall notice names a batch. The system finds every location holding the batch, blocks the
batch and moves all its stock into the recall quarantine location, shows whether any of it was
already dispensed to patients (and to which fictional patient references and prescribers), and
returns the quarantined stock to the vendor.

**Why this priority**: rare but high-impact; depends on stock and dispensing history.

**Independent Test**: dispense part of a batch to a patient, then raise a recall for that batch;
confirm every holding location is listed, all stock moves to recall quarantine, and the
dispensed patient is listed.

**Acceptance Scenarios**:

1. **Given** a batch held in the central store, pharmacy and a ward, **When** the recall reaches
   `F5:"Block and quarantine batches"`, **Then** all its stock is in recall quarantine and the
   batch is never allocated again.
2. **Given** part of the batch was dispensed, **When** the case reaches
   `F5:"Already dispensed to patients?"`, **Then** the Yes path lists the patient references and
   prescribers from dispensing history.

---

### User Story 6 - Overview, stock and demo data (Priority: P1)

A signed-in user lands on a dashboard showing open cases per flow and stage, near-expiry stock
by window, and quarantine totals. A stock page lists balances by location, item and batch with
expiry. An operator loads a fictional demo data set so every flow has cases at several stages.

**Why this priority**: it makes the five flows navigable and demonstrable.

**Independent Test**: load the demo data into an empty hospital; the dashboard shows cases in
every flow and the stock page shows balances that equal the sum of posted stock movements.

**Acceptance Scenarios**:

1. **Given** demo data is loaded, **When** the loader runs again, **Then** nothing is duplicated.
2. **Given** any posted stock movement, **When** the stock page is opened, **Then** each balance
   equals the sum of that batch-location's movements.

### Edge Cases

- An action that is not an outgoing arrow of the case's current node is refused with a clear
  message.
- Posting that would make any balance negative is refused and nothing in that action is saved.
- Issuing or dispensing more than the allocatable quantity: the allocation reports the
  shortfall; the user takes the diagram's shortfall path (`F2:"Enough stock in pharmacy?"` No,
  `F3:"In stock?"` No) instead.
- A batch that is expired (D-012 temporary rule), recalled or only in quarantine is never
  proposed by allocation.
- A case at an end node offers no further actions.
- With demo mode off, the user who raised a case cannot take an approval outcome on it, and
  NDPS sign-off needs two different users.

## Requirements *(mandatory)*

### Functional Requirements

**Cases and the diagram**

- **FR-001**: The system MUST represent each flow instance as a case that is always at exactly
  one node of its flow's Branch Inventory.
- **FR-002**: The system MUST offer, for a case, exactly the outgoing arrows of its current node,
  labelled with the diagram's outcome text, and MUST refuse any other move.
- **FR-003**: The system MUST record every move (from node, outcome, to node, user, time, note)
  in an append-only case history, and write an audit entry in the same transaction.
- **FR-004**: Moves that the diagram labels as approvals (`F1:"Committee approves?"`,
  `F1:"HOD approves requisition?"`, `F1:"Finance approves PO?"`, `F1:"Retrospective approval?"`,
  `F2:"Pharmacist reviews indent"`, `F4:"Write-off approved?"`) MUST NOT be taken by the user
  who raised the case, unless demo mode is on (D-018).
- **FR-005**: Rejection and query outcomes MUST require a reason (`F2:"Return to ward with
  reason"`, `F1:"Reject: notify requester, suggest formulary alternative"`,
  `F3:"Query to prescriber"`, `F4:"Investigate loss"`).

**Stock layer**

- **FR-010**: The system MUST hold locations of kinds central store, pharmacy, ward, OT, ICU and
  three quarantine kinds (QC, expiry/disposal, recall); quarantine locations MUST be
  non-allocatable (Principle III).
- **FR-011**: The system MUST hold vendors and batches (item, batch number, expiry date, vendor).
- **FR-012**: Stock MUST change only by posting a stock document (receipt, transfer, issue,
  dispense, return, return-to-vendor, write-off, opening stock) whose lines reference item,
  batch, location and quantity; the ledger MUST be append-only and no balance may go negative.
- **FR-013**: Allocation MUST follow D-005 (expiry, then receipt date, then batch ID), split
  across batches per D-013, exclude batches on or after expiry (D-012 temporary rule), blocked
  batches and non-allocatable locations, and report any shortfall.

**Flow stock effects** (the diagram nodes at which stock changes)

- **FR-020**: `F1:"GRN check: qty, batch, expiry, price"` All OK MUST create the batch if new and
  post a receipt into QC quarantine; `F1:"QC passed?"` Pass MUST transfer it to the central store;
  Fail MUST return it to the vendor. `F1:"Retrospective approval?"` Approved MUST post the
  emergency purchase into the central store.
- **FR-021**: `F2:"Issue approved quantity, earliest expiry first"` MUST transfer the approved
  quantity from the pharmacy to the indenting ward by FEFO allocation.
  `F2:"Sealed, unexpired, cold chain OK?"` Accepted MUST transfer returned stock back to the
  pharmacy; Rejected MUST transfer it to expiry quarantine and open a linked Flow 4 case at
  `F4:"Expired: quarantine"`.
- **FR-021a**: `F2:"Enough stock in pharmacy?"` No MUST open a linked Flow 1 requisition for the
  shortfall. The Stock received outcome MUST transfer the shortfall from the central store to
  the pharmacy by FEFO allocation, and MUST be refused while the central store cannot cover it.
- **FR-022**: `F3:"Dispense from earliest-expiry batch"` MUST dispense from the pharmacy by FEFO
  allocation and record the patient reference on the movement. Returned medicine Accepted MUST
  go back to the pharmacy; Rejected MUST go to expiry quarantine and open a linked Flow 4 case
  at `F4:"Expired: quarantine"`.
- **FR-023**: `F3:"NDPS register entry, dual sign-off"` MUST record a register entry with two
  sign-offs (two different users unless demo mode is on) before the dispense can post.
- **FR-024**: `F4:"Daily expiry scan"` MUST create one case per batch-location holding allocatable
  stock whose expiry is within the largest configured window, recording the matching window
  (alert windows are configuration, default 90/60/30, Principle VIII), and MUST NOT duplicate an
  open case. At `F4:"Move to high-use ward or offer return to vendor"` the user MUST choose one
  action: move to a chosen ward (posts a transfer; the case then follows the No path of
  `F4:"Vendor accepts return?"`) or offer return to vendor. Vendor return (Yes path) MUST post a
  return to vendor; `F4:"Expired: quarantine"`
  MUST transfer remaining stock to expiry quarantine; `F4:"Dispose via biomedical waste vendor"`
  MUST write it off.
- **FR-025**: `F5:"Find affected batches in all stores and wards"` MUST list every location with
  a balance of the batch; `F5:"Block and quarantine batches"` MUST block the batch and transfer
  all of it to recall quarantine; `F5:"Already dispensed to patients?"` MUST list dispensing
  movements of the batch with patient reference and prescriber;
  `F5:"Return to vendor for credit or replacement"` MUST return the quarantined stock.

**Screens and data**

- **FR-030**: The application MUST provide, per flow, a list of cases (filterable by current
  node) and a case page showing the flow's nodes with the current one highlighted, the
  available outcomes, the lines (item, batch, expiry, location, quantity) and the history.
- **FR-031**: The application MUST provide a dashboard (open cases per flow and node, near-expiry
  stock by window, quarantine totals) and a stock page (balance per location, item and batch).
- **FR-032**: All data MUST be read and written through the backend; the browser uses the
  sign-in service only for sign-in (D-001). Every table MUST have row-level security scoped to
  the user's hospital (D-006).
- **FR-033**: A demo-data loader MUST create fictional items, vendors, locations, batches,
  opening stock (through an opening-stock document, D-017) and cases at several nodes of every
  flow, and MUST be safe to run more than once.

### Key Entities

- **Location**: a place that holds stock; kind; allocatable or not.
- **Vendor**: a supplier named in procurement, expiry returns and recalls.
- **Batch**: an item's batch number with expiry date and vendor; may be blocked by a recall.
- **Stock document and ledger line**: a posted movement and its append-only quantity lines per
  item, batch and location; balances are their sum.
- **Case**: one instance of a flow; current node, title, raised by, lines and flow-specific
  details (ward, patient reference and IP/OP, prescriber, vendor, recalled batch, window).
- **Case event**: an append-only record of one move through the diagram.
- **NDPS register entry**: the controlled-drug record of a dispense with two sign-offs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the nodes and arrows in the Branch Inventory are reachable in the system
  and each arrow is covered by at least one automated test.
- **SC-002**: A presenter can walk one case through each of the five flows, from start to an end
  node, in under 10 minutes in total.
- **SC-003**: After any sequence of moves, every displayed balance equals the sum of posted
  movements for that batch and location, and no balance is negative.
- **SC-004**: Allocation never proposes an expired, recalled or quarantined batch, and always
  proposes batches in D-005 order (verified by automated tests).
- **SC-005**: After loading demo data, every flow has cases at no fewer than three different
  nodes, including at least one end node.

## Assumptions

- **Gaps resolved in Clarifications (2026-10-22)**: central store to pharmacy refill (FR-021a),
  entry of rejected returns into Flow 4 (FR-021, FR-022), and the choice at
  `F4:"Move to high-use ward or offer return to vendor"` (FR-024). The diagram does not show
  these; the answers are project-owner choices, not diagram rules.
- **Gap — `F3:"Substitute with prescriber consent or emergency purchase (Flow 1)"`**: assumed the
  user records which was chosen; an emergency purchase is raised as a linked Flow 1 case. Flow 1
  receives into the central store, so when such an order reaches
  `F3:"Dispense from earliest-expiry batch"` the shortfall is first moved from the central store to
  the pharmacy, the same refill rule as FR-021a.
- **Gap — `F1:"GRN check: qty, batch, expiry, price"` Short**: the diagram sends a short delivery
  to `F1:"Backorder balance quantity"` and shows no partial receipt. Assumed: nothing is received
  on Short; the whole delivery is checked again when the balance arrives.
- **Gap — `F1:"Stock below reorder level or department need"`**: reorder levels are not in the
  diagram's data; the case records which trigger applied, and no automatic reorder is built.
- Prices, invoice values, bill amounts and TPA are recorded only as free-text notes, if at all.
- One hospital (D-006); one pharmacy location; the time zone is the hospital's (Asia/Kolkata).
- The single demo account holds every permission; demo mode is on in the demo environment.
- Patient references in demo data are fictional (D-018, Principle X).
