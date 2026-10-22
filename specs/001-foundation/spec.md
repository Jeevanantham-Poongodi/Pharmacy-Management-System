# Feature Specification: Foundation

**Feature Branch**: `001-foundation` (not created yet; branches are created by hand per D-008)

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Feature 001 — Foundation. The shared base that the five flows in
docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf build on. Derive scope only from the flow
diagram and approved decisions (D-001, D-005, D-006, D-007, D-010); anything else is a
clarification item, never an invented rule."

## Sources and Scope

**Business-process source**: `docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf` (D-010). Nodes are
cited as `F<flow>:"<exact label>"`.

**Approved decisions relied on**: D-001 (browser data access only through the backend; Supabase
Auth only in the browser), D-005 (FEFO order), D-006 (one hospital, scoped by hospital),
D-007 (stock take in Foundation), D-010 (diagram is the only business-process source),
D-013 (allocation may split across batches in FEFO order), D-017 (opening-stock document).

**Pending decisions that limit this feature**: D-004 (compliance), D-011 (FEFO override),
D-012 (expiry-date boundary), D-014 (further segregation rules).

Foundation implements **no flow end to end**. It provides the shared capabilities that the flow
nodes below depend on:

| Capability | Diagram nodes / decision that justify it |
| --- | --- |
| Users, roles, location access, one hospital | D-001, D-006. Actors named in the diagram: store (`F1:"Store raises purchase requisition"`), drug committee (`F1:"Drug committee review"`), HOD (`F1:"HOD approves requisition?"`), Finance (`F1:"Finance approves PO?"`), ward / OT / ICU (`F2:"Ward raises indent to pharmacy"`), pharmacist (`F2:"Pharmacist reviews indent"`, `F3:"Pharmacist verification"`), doctor / prescriber (`F3:"Doctor writes medication order, IP or OP"`), nurse (`F3:"Nurse administers"`), audit (`F1:"Escalate to audit"`) |
| Item master: formulary flag, narcotic / Schedule X class | `F1:"Formulary item?"`, `F3:"Narcotic or Schedule X?"` |
| Batches with batch number and expiry | `F1:"GRN check: qty, batch, expiry, price"`, `F5:"Find affected batches in all stores and wards"` |
| Locations, including non-allocatable quarantine and QC | `F1:"Stock in central store"`, `F1:"Quarantine for QC"`, `F2:"Ward stock updated"`, `F4:"Expired: quarantine"`, `F5:"Block and quarantine batches"` |
| Vendor master | `F1:"RFQ to vendors, collect quotes"`, `F4:"Move to high-use ward or offer return to vendor"`, `F5:"Return to vendor for credit or replacement"` |
| Stock ledger and stock-document posting | Every stock box, for example `F1:"Stock in central store"`, `F2:"Restock in pharmacy, credit ward"`, `F4:"Stock records updated"`, `F5:"Stock records updated"` |
| FEFO allocation | `F2:"Issue approved quantity, earliest expiry first"`, `F3:"Dispense from earliest-expiry batch"`, `F4:"Keep on near-expiry watch list, flag for FEFO priority issue"`, D-005 |
| Approvals with raiser ≠ approver | `F1:"HOD approves requisition?"`, `F1:"Finance approves PO?"`, `F1:"Retrospective approval?"`, `F2:"Pharmacist reviews indent"`, `F4:"Write-off approved?"` |
| Audit trail | Constitution Principle VII; `F1:"Escalate to audit"` |
| Configuration | `F4:"Within 90, 60 or 30 days?"`, `F1:"Stock below reorder level or department need"` |
| Stock take | D-007 only. **Not shown in the diagram.** |

**Out of scope** (later features; their boundaries will be set from the diagram after this
feature is approved): requisitions, rate contracts, RFQs, POs, GRN and QC documents, invoices
and payment; indents, issues and ward returns; medication orders, dispensing, billing and the
NDPS register; daily expiry scan, write-off and disposal; recall.

## Clarifications

### Session 2026-10-22

- Q: How does stock the hospital already holds enter the system at go-live? → A: Through an
  opening-stock document per location, approved by a different user (D-017).
- Q: Is a batch allocatable on its expiry date? → A: Left pending (D-012); temporary rule: not
  allocatable on or after its expiry date.
- Q: May one allocation take the remainder from the next batches in FEFO order? → A: Yes; any
  uncovered remainder is reported as a shortfall (D-013).
- Q: Who may post a reversing document? → A: Any authorised user may raise it with a reason; it
  posts only after a different user approves it.
- Q: Should users be able to raise manual stock transfers between locations in Foundation?
  → A: No. Foundation provides the transfer posting mechanism for later features only.
- Q: In what unit is stock counted and posted? → A: One base unit per item; pack sizes and
  conversions are out of scope for this feature.
- Q: Should multi-factor sign-in be required? → A: Required for privileged roles
  (administrator, audit, Finance and roles that approve or sign off); optional for others; the
  list of privileged roles is configuration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff sign in and see only what their role, location and hospital allow (Priority: P1)

A hospital administrator creates user accounts, assigns each user one or more roles and the
locations they work in. A user signs in and can use only the functions and locations their
assignments allow, and only their own hospital's data.

**Why this priority**: Every other capability needs a trusted user identity, a hospital scope
and permission checks (D-001, D-006).

**Independent Test**: Create two users with different roles and locations, sign in as each, and
confirm each can reach only what their assignments allow. Attempt to reach another hospital's
data and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** a user with the pharmacist role at the pharmacy location, **When** they sign in,
   **Then** they can use pharmacist functions for the pharmacy location and nothing else.
2. **Given** a signed-in user, **When** a request names a hospital or location they are not
   assigned to, **Then** it is refused, and the refusal is audited.
3. **Given** a request without a valid sign-in, **When** it reaches any function, **Then** it is
   refused.
4. **Given** a deactivated user, **When** they try to sign in or use an existing session,
   **Then** access is refused.
5. **Given** the browser application, **When** it loads or shows data, **Then** it obtains all
   application data from the backend and uses the sign-in service only to sign in (D-001).

---

### User Story 2 - Master data is maintained with full history (Priority: P1)

Authorised users create and maintain items (with formulary status and narcotic / Schedule X
classification), batches (batch number, expiry date), locations (including quarantine and QC
locations) and vendors. Records with stock history can be deactivated but never deleted.

**Why this priority**: Every flow refers to items, batches, locations and vendors.

**Independent Test**: Create an item, a batch, a quarantine location and a vendor; change the
item's formulary status; confirm the change is audited with before and after values; try to
delete a record with stock history and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** an item, **When** an authorised user marks it formulary or non-formulary, **Then**
   the status is stored and the change is audited (`F1:"Formulary item?"` can read it).
2. **Given** an item, **When** it is classified as narcotic / Schedule X, **Then** later features
   can read the classification (`F3:"Narcotic or Schedule X?"`).
3. **Given** a batch, **When** it is created, **Then** it records item, batch number and expiry
   date, and the same batch number for the same item and hospital cannot be created twice.
4. **Given** a location marked as quarantine or QC, **When** stock is held there, **Then** it is
   never offered for allocation.
5. **Given** a record that has stock history, **When** a user tries to delete it, **Then** the
   system refuses and offers deactivation instead.

---

### User Story 3 - Every stock change is a posted document on an append-only ledger (Priority: P1)

Stock changes only when a stock document is posted. Each posting records who, when, what type
and why, at batch and location level. Posted documents cannot be edited; mistakes are corrected
with a reversing document. Posting is all-or-nothing, cannot drive a balance below zero, and
cannot happen twice for the same request.

**Why this priority**: All stock boxes in the diagram rely on it (Principles II, XII, XIII).

**Independent Test**: Post a document that moves stock between two locations; confirm the
balances; post a reversal and confirm balances return; resend the same request and confirm
nothing posts twice; try a posting that would make a balance negative and confirm nothing posts.

**Acceptance Scenarios**:

1. **Given** stock at a location, **When** a transfer document is posted, **Then** both balances
   change, ledger lines record batch, location, quantity, user, time, type and reason, and an
   audit entry is written, all together.
2. **Given** a posted document, **When** a user tries to edit or delete it or its ledger lines,
   **Then** the system refuses.
3. **Given** a posted document, **When** an authorised user raises a reversal with a reason and a
   different user approves it, **Then** the original's effect is undone by new ledger lines that
   reference it; the raiser cannot approve their own reversal.
4. **Given** a posting request, **When** it is sent again with the same idempotency key and the
   same content, **Then** the original result is returned and nothing new is posted.
5. **Given** a posting request, **When** the same idempotency key is sent with different
   content, **Then** it is rejected and nothing is posted.
6. **Given** two identical posting requests with the same key at the same moment, **When** they
   are processed, **Then** only one posts.
7. **Given** a posting with several lines, **When** any line fails validation or would make a
   balance negative, **Then** no line is posted.
8. **Given** any time, **When** balances are recalculated from the ledger, **Then** they equal
   the balances shown, and any difference raises an alert.
9. **Given** go-live, **When** a user raises an opening-stock document for a location and a
   different user approves it, **Then** the stock is posted; the raiser cannot approve it
   (D-017).

---

### User Story 4 - Allocation proposes batches in FEFO order and never over-issues (Priority: P1)

When a later feature needs stock (an issue or a dispense), Foundation proposes batches from
allocatable locations in the approved FEFO order and never proposes expired, quarantined or
more-than-available stock, even when several users ask at once.

**Why this priority**: `F2:"Issue approved quantity, earliest expiry first"` and
`F3:"Dispense from earliest-expiry batch"` depend on it, and it protects patients from expired
or blocked stock.

**Independent Test**: Seed batches with different and equal expiry and receipt dates, request an
allocation, and check the order; seed a quarantined and an expired batch and confirm they are
never proposed; fire concurrent requests for the last units and confirm the total never exceeds
the available quantity.

**Acceptance Scenarios** (D-005):

1. **Given** two batches with different expiry dates, **When** allocation is requested,
   **Then** the earlier expiry is proposed first.
2. **Given** two batches with the same expiry date and different receipt (GRN) dates, **When**
   allocation is requested, **Then** the earlier receipt is proposed first.
3. **Given** two batches with the same expiry date and the same receipt date, **When**
   allocation is requested, **Then** the lower batch record ID is proposed first.
4. **Given** the same stock, **When** the same allocation is requested twice, **Then** the same
   batch order is returned.
5. **Given** stock in a quarantine or QC location, **When** allocation is requested, **Then** it
   is never proposed.
6. **Given** an expired batch, **When** allocation is requested, **Then** it is never proposed.
7. **Given** 10 units available and two concurrent requests for 10 units each, **When** both are
   posted, **Then** at most 10 units are issued in total and the other request is refused.
8. **Given** batch A with 4 units (earlier expiry) and batch B with 10 units, **When** 6 units
   are requested, **Then** 4 are proposed from A and 2 from B (D-013).
9. **Given** 5 allocatable units in total, **When** 8 units are requested, **Then** 5 are
   proposed and a shortfall of 3 is reported.
10. **Given** a batch whose expiry date is today, **When** allocation is requested, **Then** it is
    not proposed (temporary rule until D-012).
11. **Given** a user, **When** they view a proposed allocation, **Then** no option to choose a
    different batch is offered (D-011 pending).

---

### User Story 5 - Approvals are recorded and the raiser cannot approve (Priority: P2)

Later features route documents for approval. Foundation records each approval or rejection with
the approver, time and reason, and refuses an approval by the user who raised the document,
whatever roles that user holds.

**Why this priority**: Every approval node in the diagram relies on it (Principle V).

**Independent Test**: Raise a document as user A who also holds the approver role; try to
approve as A and confirm refusal; approve as user B and confirm success and audit.

**Acceptance Scenarios**:

1. **Given** a document raised by user A, **When** A tries to approve it, **Then** it is refused,
   even if A holds the approver role.
2. **Given** a document raised by user A, **When** user B with the approver role approves or
   rejects it with a reason, **Then** the decision is recorded and audited.
3. **Given** a rejected document, **When** the raiser revises and resubmits it, **Then** the new
   submission is routed again and the earlier decision stays in history (the diagram's
   "Revise and resubmit" and "Resubmit" loops).

---

### User Story 6 - Auditors can review a complete, tamper-resistant audit trail (Priority: P2)

Every create, change, approval, rejection, reversal, sign-in event and export is recorded with
actor, time, action, record, before and after values and reason. Authorised audit users can
search it. Nobody can edit or delete it.

**Why this priority**: Required by Principle VII and used by `F1:"Escalate to audit"`.

**Independent Test**: Perform a set of actions, then search the trail as an auditor and confirm
each is present; try to change an entry and confirm refusal; confirm a non-audit user cannot
read it.

**Acceptance Scenarios**:

1. **Given** any audited action, **When** it completes, **Then** exactly one matching audit entry
   exists.
2. **Given** an audit entry, **When** anyone tries to change or delete it by any route, **Then**
   it is refused.
3. **Given** a user without audit access, **When** they try to read the trail, **Then** it is
   refused.
4. **Given** an auditor, **When** they export audit data, **Then** the export itself is audited
   with the filters used.

---

### User Story 7 - Thresholds are configuration with history (Priority: P2)

Authorised users set hospital-level settings such as the expiry alert windows
(`F4:"Within 90, 60 or 30 days?"`, shipped with 90, 60 and 30 days as seed values) and item
reorder levels (`F1:"Stock below reorder level or department need"`). Each change is audited and
the value in force on any past date can be shown.

**Why this priority**: Later features read these values; no threshold may be hard-coded
(Principle VIII).

**Independent Test**: Change the alert windows, confirm the new values are used from that moment,
and confirm the history shows the old values for earlier dates.

**Acceptance Scenarios**:

1. **Given** the expiry alert windows, **When** an authorised user changes them, **Then** the
   change is audited and later reads return the new values.
2. **Given** a past date, **When** the value in force on that date is requested, **Then** the
   value that applied then is returned.

---

### User Story 8 - Stock counts are reconciled through approved adjustments (Priority: P3)

Store staff count stock at a location against a snapshot of the system quantities. Differences
are posted as an adjustment document only after approval by a different user. In scope by
decision D-007; not shown in the diagram.

**Why this priority**: Needed to keep book stock true, but the hospital can start without it.

**Independent Test**: Start a count, enter counts that differ from the snapshot, submit, and
confirm the adjustment posts only after a different user approves it.

**Acceptance Scenarios**:

1. **Given** a location, **When** a count starts, **Then** the system quantities per batch are
   frozen as a snapshot for that count.
2. **Given** counted quantities that differ from the snapshot, **When** the count is submitted,
   **Then** a variance per batch is shown and nothing is posted yet.
3. **Given** a submitted count, **When** the counter tries to approve it, **Then** it is refused.
4. **Given** a submitted count, **When** a different authorised user approves it with a reason,
   **Then** one adjustment document posts all variances together.

### Edge Cases

- A posting arrives for a batch or location that was deactivated after the request was built:
  refused, nothing posted.
- A request names a hospital other than the user's: refused and audited (tenant isolation).
- A user's role or location is removed while they are signed in: the next request is checked
  against current assignments and refused.
- Stock moves while a count is in progress: the count compares against its snapshot. How
  movements after the snapshot are treated (blocked, or shown to the approver) is not shown in
  the diagram and is recorded as OI-10.
- Allocation is requested for more than the total allocatable quantity: what is available is
  proposed across batches in FEFO order and the remainder is reported as a shortfall (D-013);
  what the calling flow does next is decided by that flow (`F2:"Enough stock in pharmacy?"`,
  `F3:"In stock?"`).
- A reversal is requested for a document that is itself a reversal, or that was already
  reversed: refused.
- The network drops after a posting commits but before the reply arrives: a retry with the same
  idempotency key returns the original result.
- A batch reaches its expiry date: see FR-031 and the open question on the expiry boundary.

## Requirements *(mandatory)*

### Functional Requirements

**Identity, access and tenancy** (D-001, D-006)

- **FR-001**: The system MUST let only signed-in users use any function. Sign-in uses the
  hospital's sign-in service; every request MUST carry proof of sign-in that the backend
  verifies.
- **FR-002**: The system MUST create user accounts only through an authorised administrator.
  Self-registration MUST NOT be possible.
- **FR-003**: The system MUST let an administrator assign each user one or more roles and one or
  more locations, and deactivate users.
- **FR-004**: The system MUST provide roles for the actors named in the diagram (store staff,
  drug committee, HOD, Finance, ward / OT / ICU staff, pharmacist, doctor / prescriber, nurse,
  QC, audit) plus an administrator. Which functions each role may use MUST be configuration, set
  by the administrator, not fixed in the system.
- **FR-005**: The system MUST check, on every request, the user's role, location and hospital
  against the action. The hospital scope MUST come from the user's own assignment, never from a
  value the browser supplies.
- **FR-006**: The system MUST refuse and audit any attempt to read or change data of a hospital
  or location the user is not assigned to.
- **FR-007**: The browser application MUST obtain all application data from the backend and MUST
  use the sign-in service only for sign-in, session refresh, sign-out and MFA (D-001). The
  existing direct table read in the browser application MUST be removed.
- **FR-008**: Multi-factor sign-in MUST be required for users holding a privileged role
  (administrator, audit, Finance, and any role that approves or signs off) and optional for
  others. Which roles are privileged MUST be configuration.

**Master data** (`F1:"Formulary item?"`, `F3:"Narcotic or Schedule X?"`,
`F1:"GRN check: qty, batch, expiry, price"`)

- **FR-010**: The system MUST maintain items with at least a name, a base unit (for example
  tablet or vial), a formulary status (formulary / non-formulary) and a narcotic / Schedule X
  classification. Every quantity for the item MUST be in its base unit.
- **FR-011**: The system MUST maintain batches with item, batch number and expiry date. A batch
  number MUST be unique per item within a hospital.
- **FR-012**: The system MUST maintain locations with a type. Types MUST include central store,
  pharmacy, ward, OT, ICU, QC and quarantine. QC and quarantine locations MUST be
  non-allocatable.
- **FR-013**: The system MUST maintain vendors.
- **FR-014**: The system MUST audit every master-data change with before and after values.
- **FR-015**: The system MUST NOT allow deletion of an item, batch, location or vendor that has
  stock history; it MUST allow deactivation instead.

**Stock ledger and posting** (every stock box in F1–F5)

- **FR-020**: Stock MUST change only by posting a stock document. Document types are receipt,
  issue, transfer, return, adjustment, write-off and opening stock; each later feature uses the
  types it needs. In this feature, users can raise only opening-stock documents (FR-029),
  stock-count adjustments (FR-072) and reversals (FR-023). Transfers and the other types are a
  posting mechanism for later features; no manual transfer function is offered.
- **FR-021**: Every ledger line MUST record item, batch, location, quantity, document, posting
  user, server time, document type and reason.
- **FR-022**: Ledger lines and posted documents MUST NOT be editable or deletable by any route.
- **FR-023**: Corrections MUST be made by a reversing document that references the original and
  carries a reason. An authorised user raises it; it posts only after a different user approves
  it (FR-041). A document can be reversed once; a reversal cannot be reversed.
- **FR-024**: A document, all its ledger lines and its audit entries MUST post together or not at
  all.
- **FR-025**: No posting may make a balance negative.
- **FR-026**: Every posting request MUST carry an idempotency key. Same key and same content
  returns the original result; same key and different content is rejected; a key whose first
  request is still running is rejected; only completed postings count as used.
- **FR-027**: Balances MUST equal the totals derived from the ledger. A scheduled check MUST
  compare them and alert on any difference.
- **FR-028**: Stock moves into or out of a QC or quarantine location MUST be transfer documents
  with a reason.
- **FR-029**: Stock the hospital already holds at go-live MUST enter through an opening-stock
  document per location (item, batch, expiry, quantity), posted like any other document and
  approved by a different user than the one who raised it (FR-041) (D-017).

**FEFO allocation** (`F2:"Issue approved quantity, earliest expiry first"`,
`F3:"Dispense from earliest-expiry batch"`, D-005)

- **FR-030**: Allocation MUST consider only allocatable locations and active, unexpired batches.
- **FR-031**: Allocation MUST NOT propose an expired batch. Whether a batch is allocatable on its
  expiry date, and how month-only expiry dates are read, are pending (D-012). **Temporary safety
  rule until D-012 is decided**: a batch MUST NOT be allocated on or after its expiry date. The
  rule MUST be a configuration value so it can change without code changes.
- **FR-032**: Allocation MUST order batches by earliest expiry date, then earliest receipt (GRN)
  posting date, then lowest batch record ID, and MUST return the same order for the same stock.
- **FR-033**: When the first FEFO batch cannot cover the requested quantity, allocation MUST take
  the remainder from the next batches in FEFO order (D-013). It MUST NOT propose more than the
  allocatable quantity, and MUST report any uncovered remainder to the calling feature as a
  shortfall.
- **FR-034**: Concurrent allocations and postings MUST NOT together issue more than is
  available.
- **FR-035**: The system MUST NOT offer a choice of batch other than the FEFO proposal until
  D-011 is decided.

**Approvals** (approval nodes in F1, F2, F4)

- **FR-040**: The system MUST record each approval or rejection with approver, time, decision
  and reason.
- **FR-041**: The user who raised a document MUST NOT approve or reject it, whatever roles they
  hold. The check MUST compare user identity.
- **FR-042**: A rejected document MUST be revisable and resubmittable, keeping earlier decisions
  in its history.
- **FR-043**: Which role approves which document type MUST be configuration. Further separation
  rules are not part of this feature until D-014 is decided.

**Audit** (Principle VII)

- **FR-050**: The system MUST write an audit entry for every create, change, approval,
  rejection, reversal, sign-in event, refused access attempt and data export, with actor, time,
  action, record, before and after values and reason where one applies.
- **FR-051**: Audit entries MUST NOT be editable or deletable by any route, including direct
  database access by the application.
- **FR-052**: Only users with audit access MUST be able to read or export the audit trail; each
  export MUST itself be audited with its filters.
- **FR-053**: Audit entries and logs MUST NOT contain secrets, tokens or more personal data than
  the action needs.

**Configuration** (`F4:"Within 90, 60 or 30 days?"`, `F1:"Stock below reorder level or
department need"`)

- **FR-060**: The system MUST store hospital-level settings, including the expiry alert windows
  (seed values 90, 60 and 30 days), and item reorder levels per location.
- **FR-061**: Each change MUST be audited and dated, and the value in force on any past date
  MUST be retrievable.

**Stock take** (D-007; not in the diagram)

- **FR-070**: An authorised user MUST be able to start a count for a location, freezing a
  per-batch snapshot.
- **FR-071**: Counts MUST be entered per batch; the variance against the snapshot MUST be shown
  before submission.
- **FR-072**: A submitted count MUST post as one adjustment document only after approval by a
  different user (FR-041). Which role approves is configuration (FR-043).

### Key Entities

- **Hospital**: the tenant. Every other record belongs to exactly one hospital.
- **User**: a signed-in person; has roles and locations within one hospital; can be deactivated.
- **Role** and **Permission**: named roles (FR-004) and the functions each role may use,
  configured by the administrator.
- **Item**: a medicine or product; base unit; formulary status; narcotic / Schedule X
  classification; active flag.
- **Batch**: an item's batch number and expiry date; belongs to one item.
- **Location**: a place where stock is held; has a type; allocatable or not.
- **Vendor**: a supplier referenced by later flows.
- **Stock document**: a typed, posted record of a stock change, with reason, raiser, poster,
  idempotency key, and an optional reference to the document it reverses.
- **Ledger line**: one batch-location quantity change belonging to a stock document.
- **Balance**: the current quantity per item, batch and location, always equal to the ledger
  total.
- **Approval**: a decision on a document by a user, with reason and time.
- **Audit entry**: an append-only record of an action.
- **Setting**: a dated configuration value with history.
- **Stock count**: a count session for a location with its snapshot, counted quantities and
  approval.

## Open Items (gaps not shown in the diagram; not invented)

| ID | Gap | Where it is decided | Effect on this feature |
| --- | --- | --- | --- |
| OI-1 | How opening stock enters the system | **Resolved**: D-017 (FR-029) | Opening-stock document with approval |
| OI-2 | Expiry-date boundary, month-only expiry, any "do not dispense" window | D-012, pending (FR-031) | Temporary rule: not allocatable on or after the expiry date |
| OI-3 | Splitting one allocation across batches; unfilled remainder | **Resolved**: D-013 (FR-033) | Split in FEFO order; remainder reported as shortfall |
| OI-4 | FEFO override | D-011 | No override is offered (FR-035) |
| OI-5 | Separation rules beyond raiser ≠ approver | D-014 | Only raiser ≠ approver is enforced |
| OI-6 | The initial permission set for each role | Administrator configuration | Shipped empty except administrator; to be set by the hospital |
| OI-7 | Who approves stock-count variances; any value bands | Configuration (FR-043, FR-072) | Approver role is configuration; no value bands are invented |
| OI-8 | NDPS details beyond the dispense branch; retention periods | D-004 | Classification is stored; no register in this feature |
| OI-9 | Sign-in service configuration committed in the public frontend repo | D-016 | Must be resolved before go-live |
| OI-10 | Stock movements at a location while a count is open | Clarification | Count compares against its snapshot; handling of later movements is undecided |
| OI-11 | Response-time and onboarding-time targets | Project owner | No numeric performance targets are set in this spec |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of attempts to read or change another hospital's or an
  unassigned location's data are refused and audited.
- **SC-002**: In repeated replay of the same posting request (at least 100 retries, including
  simultaneous ones), the stock changes exactly once.
- **SC-003**: Under simultaneous requests for the last available units, the total issued never
  exceeds the quantity available, in 100% of test runs.
- **SC-004**: For every FEFO test case (different expiry, equal expiry with different receipt
  dates, equal expiry and receipt dates), the proposed order matches D-005 in 100% of runs.
- **SC-005**: Balances recalculated from the ledger match the shown balances at every check; a
  deliberately introduced difference is detected at the next check.
- **SC-006**: 100% of audited actions in the acceptance run have exactly one audit entry, and 0
  attempts to change or delete audit entries or ledger lines succeed.
- **SC-007**: In acceptance testing, a user created by an administrator can sign in on the first
  attempt and reach exactly the functions and locations assigned to them, and no others.
- **SC-008**: For any item, batch or location, staff can see its current stock per location, and
  the figures match the ledger in 100% of checked cases. (Response-time targets: OI-11.)

## Assumptions

- One hospital is served now; the data model allows more later (D-006).
- User accounts are created by an administrator; self-registration is not offered.
- Sign-in uses the approved sign-in service (D-001), which supports multi-factor sign-in
  (FR-008).
- Pack sizes and unit conversions are out of scope; quantities are in each item's base unit.
- Roles come from the actors named in the diagram. Their permissions are configuration (OI-6).
- Prices, invoice values and tax are out of scope; they belong to the procurement feature.
- Barcode scanning and cold-chain sensors are out of scope.
- Notifications are in-app only in this feature.
- The time zone for dates is the configured hospital time zone (default Asia/Kolkata).
