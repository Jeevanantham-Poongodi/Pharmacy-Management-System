# Feature Specification: Foundation — Master Data, Stock Ledger, Access Control and Audit Trail

**Feature Branch**: `001-foundation-masters-ledger`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "001 Foundation — master data (items, batches, vendors, locations incl. quarantine/QC locations, formulary, configuration), append-only stock ledger and stock documents, authentication, roles and segregation of duties, audit trail. Per PMS manual chapters 02, 03, 04, 10, 13, 16."

## Sources and Scope

**Domain Reference chapters implemented**: these are chapters of the PMS Process & Operations
Manual (PMS-OPS-MAN-002 v2.0):

- 02: System overview (store hierarchy, design principles)
- 03: Roles, RACI, segregation of duties, delegation
- 04: Master data and configuration
- 10: Inventory control (FEFO, stock states, quarantine, reconciliation, valuation)
- 13: Core entities, stock ledger, numbering, retention
- 16: Authentication, role × location access, audit trail

**Appendix D decision IDs covered**: none directly. This feature has no flow decisions of its own.
It provides the controls that every Flow 1–5 decision depends on: allocatable stock, FEFO
proposal, segregation checks, approval routing and the audit trail. Each flow feature (002–006)
will test its own decision IDs against these controls.

**In scope**:

- Master data: items, formulary, vendors, rate contracts, locations, reorder parameters.
- Configuration: approval matrix, system parameters, segregation rules.
- Master data change control.
- Batches.
- The batch-level stock ledger, and the generic stock-document framework with its reversal rule.
- Opening stock, inter-location transfer, quarantine move and stock adjustment documents.
- Allocatable-stock and FEFO rules.
- Batch blocking.
- User accounts and authentication.
- Role × location access, delegation and segregation of duties.
- Document numbering.
- The audit trail.

**Out of scope** (delivered by later features):

- Flow documents: requisitions, POs, GRNs and QC (002); indents and issues (003); dispensing and
  the NDPS register (004); write-offs and disposal (005); recalls (006). These build on this
  feature's stock-document framework.
- Billing, accounts payable and HIS/ERP interfaces (007).
- Reports, KPIs, dashboards and notifications beyond what this feature itself needs (008).
- Patient records.

### Conflicts between the manual and the constitution

The constitution wins in each case below. Each conflict is recorded here as the constitution
requires.

| # | Manual says | Constitution says | Rule applied in this spec |
|---|-------------|-------------------|---------------------------|
| C1 | §10.2 and §13.1: each batch quantity in a location has a **state** (QC Pending, Available, In Transit, Blocked, Quarantine, Return to Vendor, Disposed) | Principle III: quarantine is a **location**, not a flag | Every non-allocatable state except Blocked is a dedicated location (QC Pending, Quarantine, Return to Vendor, In Transit) at each store. A quantity's state comes from the type of location it is in, and a change of state is a posted transfer. **Blocked** is an immediate batch-level allocation block, which the constitution explicitly allows "even before the physical move". It is followed by a transfer into Quarantine. **Disposed** means the quantity has left stock through a write-off. |
| C2 | §13.2: an emergency purchase posts "+ Available" | Reference Flows: an emergency purchase MUST post a GRN and pass QC | The ledger does not allow any receipt document to post directly into an allocatable location. Every receipt goes into a QC Pending location. Feature 002 inherits this rule. |
| C3 | §3.3 does not list "PO creator ≠ payment releaser" | Principle V: PO creator ≠ GRN poster ≠ payment releaser | The segregation rule set includes all three pairs. The manual's extra rules (stock-take counter ≠ variance approver; vendor bank/GST maker-checker) are kept as well. |

## User Scenarios & Testing *(mandatory)*

### Actors

| Actor | Role in this feature |
|-------|----------------------|
| PMS Administrator | Creates users, assigns roles and locations, maintains configuration. Cannot post stock transactions. |
| Master Data Requester | Any authorised user who raises a master data change request |
| Data Owner | Approves master data changes for their area: Drug Committee (formulary), Purchase Head (vendors, rate contracts), Chief Pharmacist (item clinical attributes), Head of Finance (approval limits) |
| Store Keeper / Pharmacist | Posts stock documents (opening stock, transfers, quarantine moves, stock counts) |
| Store In-charge / Chief Pharmacist | Approves stock adjustments and quarantine releases within their limits |
| Auditor | Has read-only access to everything, including the audit trail. Cannot change anything. |
| Any user | Signs in, works within their role × location, and delegates approvals while away |

### User Story 1 - Users sign in securely and see only what their role and location allow (Priority: P1)

The PMS Administrator creates a named account for each staff member and assigns one or more roles,
each tied to one or more locations. Users sign in with their own credentials. Approvers above the
configured value, controlled-drug signatories and administrators must also use a second factor.
Each user can then reach only the screens, actions and data that their role allows at the
locations assigned to them.

**Why this priority**: Every other capability depends on knowing who the user is and what they
may do. Segregation of duties and the audit trail both need named, authenticated identities.

**Independent Test**: Create two users: a pharmacist assigned to the OP pharmacy and an auditor.
Confirm that the pharmacist can act in the OP pharmacy but not the ICU satellite, that the auditor
can view but not change anything, and that the lockout, MFA and session-timeout rules work.

**Acceptance Scenarios**:

1. **Given** a new staff member, **When** the Administrator creates their account, **Then** the
   account is individual and named. Shared or generic accounts cannot be created.
2. **Given** a user with the Pharmacist role at the OP pharmacy only, **When** they try to post a
   transaction at the ICU satellite, **Then** the action is refused and the attempt is
   audit-logged.
3. **Given** a user who enters wrong credentials 5 times in a row (the configured limit), **When**
   they try again, **Then** the account is locked until an Administrator unlocks it or the
   configured lockout period ends.
4. **Given** a user whose role requires MFA (approver above the configured value, controlled-drug
   signatory, Administrator), **When** they sign in, **Then** they must complete a second factor
   before reaching any screen.
5. **Given** a signed-in user on a shared workstation, **When** they are inactive for the
   configured timeout (default 15 minutes), **Then** the session ends and they must sign in again.
6. **Given** an action that needs a second signatory, **When** the second person confirms it,
   **Then** they must authenticate on the same screen with their own credentials. A different
   identity from the first signer is enforced.
7. **Given** an Administrator, **When** they try to post any stock transaction, **Then** the system
   refuses.
8. **Given** an Auditor, **When** they try to create, change or approve anything, **Then** the
   system refuses.
9. **Given** a user whose password is older than the configured maximum age (default 90 days),
   **When** they sign in, **Then** they must change it before continuing.

---

### User Story 2 - Master data is set up and changed only through controlled requests (Priority: P1)

Before any flow can run, the hospital needs its item master, formulary, vendor master, rate
contracts and location hierarchy. Locations include a QC Pending, Quarantine and Return to Vendor
location at each store. Every change to master data goes through a change request. The
Administrator checks it for completeness and duplicates, the right data owner approves it, and it
takes effect from an effective date. The previous values are kept so that past transactions stay
explainable.

**Why this priority**: Every flow decision reads master data, including formulary status, rate
contract, reorder level and approver. Uncontrolled master data leads to wrong decisions.

**Independent Test**: Raise change requests to create an item, a vendor, a rate contract and a
central store with its QC, Quarantine and Return to Vendor locations. Approve each as the correct
data owner. Confirm the records become active only on their effective date and that the history
shows the previous values. Confirm that a vendor bank-detail change needs two different users.

**Acceptance Scenarios**:

1. **Given** a requester, **When** they raise a change request to create or edit an item, vendor,
   rate contract, formulary entry or location, **Then** the request records the reason and any
   supporting evidence, and nothing changes until it is approved.
2. **Given** a submitted change request, **When** the Administrator reviews it, **Then** the
   system flags missing mandatory fields and likely duplicates. Duplicate vendors are matched on
   GSTIN and PAN. Duplicate items are matched on generic name, strength and form.
3. **Given** a reviewed request, **When** the right data owner approves it, **Then** the change
   goes live on its effective date and the previous version is kept in history.
4. **Given** a request approved by the wrong data owner (for example, a Purchase Head approving a
   formulary change), **When** they try to approve, **Then** the system refuses.
5. **Given** a change to vendor bank details or GSTIN, **When** the maker and checker are the same
   user, **Then** the system refuses.
6. **Given** a new store location, **When** it is created, **Then** it MUST have, at minimum, an
   allocatable location, a QC Pending location, a Quarantine location and a Return to Vendor
   location. The system refuses to activate a store that lacks any of them.
7. **Given** an item marked inactive, **When** anyone tries to use it in a new stock document,
   **Then** the system refuses, while its history remains viewable.
8. **Given** a vendor whose drug licence expires within the configured warning window (default 30
   days), **When** the daily check runs, **Then** the vendor is flagged so that new POs to that
   vendor are blocked (enforced by feature 002), and an alert is raised.
9. **Given** an item, batch, vendor or location with ledger history, **When** anyone tries to
   delete it, **Then** the system refuses. Only deactivation is allowed.
10. **Given** a change to approval limits, expiry windows or segregation rules, **When** it is
    approved, **Then** Internal Audit is notified.

---

### User Story 3 - Every stock movement is a posted document on an append-only, batch-level ledger (Priority: P1)

Stock is recorded only as ledger entries created by posting documents. Each entry carries item,
batch, expiry, location, quantity, value, document, user, time and reason. At go-live, opening
stock is loaded through an opening-stock document. After that, stock moves between locations only
through transfer documents. Mistakes are corrected by posting a reversal that references the
original document. Posted documents and ledger entries can never be edited or deleted.

**Why this priority**: The constitution's core guarantees depend on this ledger: traceability, no
silent stock changes, and quarantine as a location. All five flows post to it.

**Independent Test**: Post an opening-stock document, a transfer, a reversal of that transfer and
a quarantine move. Confirm that balances equal the replayed ledger at every step, that the
original documents cannot be edited, and that a direct edit of any balance or ledger entry is
refused.

**Acceptance Scenarios**:

1. **Given** a draft stock document, **When** it is posted, **Then** one ledger entry is written
   per line with item, batch, expiry, from-location, to-location, quantity, batch cost value,
   document type and number, user, timestamp and reason. The document becomes read-only.
2. **Given** a document line without a batch number, expiry date or location, **When** it is
   posted, **Then** the system refuses.
3. **Given** a posted document, **When** any user, including an Administrator, tries to edit or
   delete it or its ledger entries, **Then** the system refuses and logs the attempt.
4. **Given** a posted document that is wrong, **When** an authorised user posts a reversal with a
   reason, **Then** equal and opposite ledger entries are written referencing the original. The
   original shows as "Reversed" and cannot be reversed a second time.
5. **Given** any point in time, **When** current balances are compared with a full replay of the
   ledger, **Then** they match exactly. A daily automated check reports any drift to the Chief
   Pharmacist and the PMS Administrator.
6. **Given** a transfer that would take a location's batch quantity below zero, **When** it is
   posted, **Then** the system refuses.
7. **Given** a receipt-type document, such as opening stock flagged "awaiting QC" or a GRN from
   feature 002, **When** it is posted, **Then** its destination MUST be a QC Pending location. The
   ledger refuses any receipt posting directly into an allocatable location (conflict C2). The
   one exception is opening stock declared as already QC-released at go-live.
8. **Given** a batch, **When** a user asks for its trace, **Then** the system lists every ledger
   entry for that batch across all locations in time order, with documents and users.
9. **Given** an opening-stock document, **When** go-live is declared closed, **Then** no further
   opening-stock documents can be posted.

---

### User Story 4 - Only safe stock can be allocated, and FEFO decides which batch (Priority: P1)

When a later flow asks for stock of an item at a location, the system offers only allocatable
batches and proposes them in FEFO order. Stock is allocatable only if it is in an allocatable
location, is not blocked, is not expired, and is outside the configured "do not issue" window.
FEFO order is earliest expiry, then earliest receipt, then smallest quantity. When a user picks a
different batch, that is an override: it needs a reason and is logged for the weekly FEFO
compliance report. When a batch is blocked, for recall or expiry, it stops being allocatable
everywhere at once.

**Why this priority**: Flows 2 and 3 cannot issue or dispense safely without this. It enforces
Principles III and IV in one place.

**Independent Test**: Load three batches of one item with different expiries into one location,
plus a fourth batch in Quarantine and a fifth that is blocked. Ask for an allocation proposal.
Confirm that only the three allocatable batches are offered, in FEFO order. Then pick the second
batch and confirm a reason is required and logged. Then block the first batch and confirm it
disappears from the proposal at once.

**Acceptance Scenarios**:

1. **Given** batches of one item in an allocatable location with different expiries, **When**
   an allocation proposal is requested, **Then** the batches are ordered by earliest expiry, then
   earliest receipt date, then smallest quantity.
2. **Given** stock in a QC Pending, Quarantine, Return to Vendor or In Transit location, **When**
   an allocation proposal is requested, **Then** that stock is never offered.
3. **Given** a batch past its expiry date, or inside the configured do-not-issue window, **When**
   an allocation proposal is requested, **Then** that batch is not offered.
4. **Given** an allocation proposal, **When** the user selects a batch other than the first FEFO
   batch, **Then** a reason from the configured override reason list is required, and the
   override is audit-logged and flagged for the FEFO compliance report.
5. **Given** an available batch, **When** an authorised user blocks it with a reason (recall or
   expiry pending physical move), **Then** it is immediately non-allocatable at every location
   holding it, and a list of locations and quantities to move into Quarantine is produced.
6. **Given** a blocked batch, **When** its stock is moved into Quarantine, **Then** the move is a
   posted quarantine-transfer document with a reason, and the quarantine tag records reason, date,
   document reference and user.
7. **Given** stock in Quarantine, **When** anyone tries to move it anywhere other than through
   vendor return, approved write-off or release on lifting a recall block, **Then** the system
   refuses. Lifting a block needs the Chief Pharmacist and is logged as an override.
8. **Given** quarantined stock older than the configured age (default 30 days), **When** the daily
   check runs, **Then** it is escalated to the Chief Pharmacist.

---

### User Story 5 - Approvals route by the configured matrix, respect segregation of duties and support delegation (Priority: P2)

Approvals in every flow are routed by the configured approval matrix: document type, condition or
value band, and approver role(s). The system blocks any segregation-of-duties breach by comparing
the people involved, not their roles. Approvers set out-of-office delegation to a named deputy for
a date range, and both names are stored on each approval.

**Why this priority**: Every flow feature reuses this engine. It is P2 only because P1 stories can
be demonstrated without approvals.

**Independent Test**: Configure the default approval matrix. Submit test documents of different
values and confirm each routes to the correct approver tier. Attempt each segregation breach in
the rule set and confirm each is blocked and logged. Set a delegation and confirm that approvals
route to the deputy, that delegation cannot be chained, and that it cannot route an approval to
the original requester.

**Acceptance Scenarios**:

1. **Given** the approval matrix, **When** a document needing approval is submitted, **Then** it
   routes to the approver role(s) whose band matches its type and value. A band that needs two
   approvers, such as "Head of Finance and Medical Superintendent", waits for both.
2. **Given** a user who raised, created or posted a document, **When** that same user tries to
   perform a step the segregation rule set forbids for them on that document, **Then** the
   system refuses and logs the attempt. This applies even if they hold the required role.
3. **Given** the segregation rule set, **When** it is inspected, **Then** it contains at least:
   - raiser ≠ approver (requisition, PO, write-off, adjustment),
   - PO creator ≠ GRN poster,
   - GRN poster ≠ payment releaser,
   - PO creator ≠ payment releaser,
   - NDPS dispenser ≠ second signatory,
   - stock-take counter ≠ variance approver,
   - emergency purchaser ≠ retrospective approver,
   - vendor bank/GST maker ≠ checker.
4. **Given** an approver who sets a delegation to a deputy for a date range, **When** an approval
   arrives in that range, **Then** it routes to the deputy, and the record stores both the
   original approver and the deputy.
5. **Given** a deputy, **When** they try to delegate onward, **Then** the system refuses (no
   chained delegation).
6. **Given** a delegation that would send an approval to the document's own requester, **When** it
   would apply, **Then** the system refuses that routing and escalates to the next approver tier.
7. **Given** only one eligible user for a step who is also barred by segregation, **When** the step
   is reached, **Then** it is blocked and the Chief Pharmacist is alerted. It is never
   auto-approved.

---

### User Story 6 - Thresholds and parameters are configuration with history (Priority: P2)

Authorised data owners maintain the approval matrix, system parameters and reorder parameters as
configuration. Defaults are seeded from the manual. Each change has an effective date and keeps
history. Item reorder levels can be manually overridden with a reason and an end date.

**Why this priority**: The constitution requires that no threshold is hard-coded, and later
features read these values.

**Independent Test**: Change the near-expiry windows and a PO approval band through change
control. Confirm that the new values apply from the effective date, the old values remain in
history, and Internal Audit is notified.

**Acceptance Scenarios**:

1. **Given** a fresh installation, **When** configuration is viewed, **Then** it contains the
   manual's recommended defaults (§4.7 approval matrix, §4.8 system parameters, §4.1 minimum shelf
   life), each marked as a default.
2. **Given** a configuration change, **When** it is approved, **Then** it takes effect from its
   effective date. Documents created earlier keep the value that applied when they were created.
3. **Given** an item at a location, **When** a pharmacist sets a manual reorder-level override,
   **Then** a reason and an end date are required, the override expires automatically on that
   date, and it is audit-logged.
4. **Given** stored reorder parameters (average daily usage, lead time, safety stock, maximum
   level), **When** they are viewed, **Then** the reorder level and suggested order quantity are
   shown using the manual's §4.6 formulas.

---

### User Story 7 - Stock counts and approved variance adjustments (Priority: P3)

Store staff count stock against a frozen snapshot of system quantities. Variances are recounted
once, then the confirmed variance is posted as an adjustment only after approval under the matrix
(by value band), with a reason code. The counter cannot approve their own variance.

**Why this priority**: Reconciliation is required by chapter 10. It is P3 because the hospital can
operate briefly without it. [NEEDS CLARIFICATION: Q2, whether stock take belongs in Foundation or
a later feature]

**Independent Test**: Start a count for one location, enter counts that differ from the snapshot,
recount, and submit. Confirm the adjustment posts only after an approver in the right value band
(not the counter) approves it, and that the ledger and balances update correctly.

**Acceptance Scenarios**:

1. **Given** a location, **When** a count is started, **Then** the system freezes a snapshot of
   system quantities per batch for that location. Movements posted after the snapshot are shown
   separately so they do not distort the count.
2. **Given** a counted quantity that differs from the snapshot, **When** the count is submitted,
   **Then** the line requires one recount before the variance is confirmed.
3. **Given** a confirmed variance, **When** it is submitted for approval, **Then** it routes by
   value band (default up to ₹5,000 per item to the Store In-charge; above that to the Chief
   Pharmacist and Internal Audit) and requires a reason code: count error, unrecorded issue,
   damage, theft suspected, or unit-of-measure error.
4. **Given** an approved variance, **When** it is posted, **Then** an adjustment document writes
   ledger entries valued at batch cost.
5. **Given** the user who counted, **When** they try to approve the variance, **Then** the system
   refuses.

---

### User Story 8 - Auditors can review a complete, tamper-proof audit trail (Priority: P2)

Every create, change, approval, rejection, override, reversal, print, export and blocked
segregation attempt is written to an append-only audit trail. The Auditor can search it by user,
document, record, date range and action type, and can export results. The export itself is also
logged.

**Why this priority**: This is needed for inspections and for DPDP accountability. It is P2
because it is written from day one by P1 stories but is reviewed later.

**Independent Test**: Perform a set of actions across Stories 1–6. Confirm each has an audit
entry with the required fields, that no role (including Administrator) can edit or delete an
entry, and that an export by the Auditor is itself logged.

**Acceptance Scenarios**:

1. **Given** any audited action, **When** it occurs, **Then** an entry records:
   - user, role and location,
   - workstation or device,
   - timestamp,
   - record and field,
   - old value and new value,
   - reason where one is required.
2. **Given** any role, including Administrator, **When** they try to edit or delete an audit
   entry, **Then** the system refuses, and the attempt is itself logged.
3. **Given** the Auditor, **When** they search by user, document number, record, action type or
   date range, **Then** matching entries are returned in time order.
4. **Given** an export or print of any data set, **When** it is performed, **Then** the audit
   trail records who exported or printed which data set, with which filters, and when.
5. **Given** the audit trail, **When** its contents are checked for a past period, **Then** it is
   complete and unbroken for the configured retention period (default 10 years). Any break in the
   sequence is detectable.

---

### Edge Cases

- **Two users post documents against the same batch and location at the same moment**: both
  postings are applied in a single order, and the second is refused if it would take the
  quantity below zero.
- **A reversal would make stock negative because the stock has already moved on** (for example,
  reversing a transfer whose stock was later issued): the reversal is refused. The user must
  first reverse or correct the later movement.
- **Same batch number, same item, different expiry dates**: the batch is refused as a conflict,
  because a batch is identified by item, batch number and expiry.
- **Approver's account is disabled while approvals are pending**: pending approvals re-route to
  the deputy or the next tier, and the Chief Pharmacist is alerted.
- **Change request to deactivate a location that still holds stock**: the request is refused
  until the stock is transferred out.
- **Effective-dated change scheduled for the future**: the current value stays in force until
  that date. Two pending changes to the same field with overlapping dates are refused.
- **Clock or time-zone differences between devices**: all timestamps come from the server and use
  the configured hospital time zone (Asia/Kolkata).
- **Expiry date given as month and year only** (common on Indian packs): it is stored as the last
  day of that month.
- **Opening stock for an expired or near-expiry batch**: it is accepted only into a Quarantine
  location, with the reason "expired at go-live".
- **User assigned a role at a location that is later deactivated**: the assignment is ended
  automatically and audit-logged.
- **Unit-of-measure mismatch on a stock document**: all ledger quantities are held in the item's
  issue unit. Purchase-unit quantities are converted with the item's conversion factor, and a
  quantity that is not a whole number of issue units is refused.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication and access**

- **FR-001**: The system MUST support only individual, named user accounts. Shared or generic
  accounts MUST NOT be creatable.
- **FR-002**: The system MUST enforce these configurable sign-in rules:
  - minimum password length (default 12),
  - maximum password age (default 90 days),
  - lockout after a set number of failed attempts (default 5),
  - inactivity timeout (default 15 minutes).
- **FR-003**: The system MUST require a second authentication factor for:
  - Administrators,
  - controlled-drug signatories,
  - approvers whose approval band exceeds the configured value (default ₹1,00,000),
  - remote access.
- **FR-004**: Actions needing a second signatory MUST require the second person to authenticate
  on the same screen with their own credentials. The system MUST verify that the second identity
  differs from the first.
- **FR-005**: Access MUST be granted as role × location. Every action MUST be authorised against
  the user's roles at the location the action affects.
- **FR-006**: The system MUST ship the manual's role catalogue (§3.1) and access matrix (§16.2) as
  the default role definitions. PMS Administrators MUST be prevented from posting transactions,
  and Auditors from making any change.
- **FR-007**: Single sign-on with the hospital directory MAY be supported where available. When
  it is used, the hospital directory's password rules apply instead of FR-002, and FR-003 still
  applies.

**Master data and change control**

- **FR-008**: The system MUST hold an item master with the fields in manual §4.1, including the
  mandatory fields:
  - item code (system-generated),
  - generic name with strength and form,
  - category,
  - formulary status,
  - schedule,
  - storage condition,
  - purchase UOM and conversion,
  - issue UOM,
  - HSN code and GST rate.
- **FR-009**: The system MUST hold the formulary with status (formulary, restricted, non-formulary),
  approved brands per generic, and formulary alternatives for each non-formulary generic.
- **FR-010**: The system MUST hold a vendor master with the fields in manual §4.3. It MUST block
  duplicate vendors by GSTIN and PAN, and MUST flag vendors whose drug licence expires within the
  configured window (default 30 days).
- **FR-011**: The system MUST hold rate contracts with vendor, item, pack, rate, discount, GST,
  validity dates, minimum and maximum order quantities, lead time and ceiling value.
- **FR-012**: The system MUST hold a location hierarchy with:
  - type (central store, pharmacy, ward, OT, ICU, QC Pending, Quarantine, Return to Vendor,
    In Transit),
  - parent location,
  - cost centre,
  - storage zones (room temperature, cold chain, controlled-drug cabinet),
  - optional bin codes,
  - authorised users,
  - for ward locations, an indentable item list and par levels.
- **FR-013**: Every store location MUST have its own QC Pending, Quarantine and Return to Vendor
  child locations before it can be activated (conflict C1). A store with a cold-chain zone MUST
  also have a cold-chain quarantine location.
- **FR-014**: The system MUST hold batches identified by item + batch number + expiry date, with
  manufacturing date, manufacturer and unit cost. A batch MUST be created only by a receipt-type
  document line, never edited directly.
- **FR-015**: Every create or edit of master data MUST go through a change request with reason and
  evidence. The request MUST pass an Administrator completeness/duplicate check and approval by
  the configured data owner for that area. The change MUST go live from an effective date with
  full version history kept.
- **FR-016**: Changes to vendor bank details and GSTIN MUST need maker-checker approval by two
  different users.
- **FR-017**: Master records with ledger or document history MUST NOT be deletable. Only
  deactivation is allowed. Inactive records MUST be refused on new documents.
- **FR-018**: Approved changes to approval limits, expiry windows and segregation rules MUST notify
  Internal Audit.

**Configuration**

- **FR-019**: The system MUST hold the approval matrix (document type, condition or value band,
  one or more approver roles) as configuration, seeded with the manual §4.7 defaults.
- **FR-020**: The system MUST hold all thresholds as configuration with effective dates and
  history, seeded with the defaults from manual §4.1, §4.8 and §16.1. A document MUST keep the
  configuration values in force when it was created. The thresholds include:
  - near-expiry windows,
  - do-not-issue window,
  - minimum shelf life at receipt,
  - tolerances,
  - deadlines,
  - quarantine age alert,
  - session and password rules,
  - MFA value threshold,
  - retention periods.
- **FR-021**: The system MUST hold reorder parameters per item per location (average daily usage,
  lead time, safety stock, maximum level, ABC and VED class). It MUST show the reorder level and
  suggested order quantity using the manual §4.6 formulas, and MUST allow a manual override with
  reason and end date.
- **FR-022**: The system MUST hold the FEFO override reason list and the stock-adjustment reason
  codes as configurable lists.

**Stock ledger and documents**

- **FR-023**: Stock MUST change only by posting a stock document. Every posting MUST write
  append-only ledger entries carrying:
  - item, batch, expiry,
  - from-location, to-location,
  - quantity in issue units,
  - value at batch cost,
  - document type and number,
  - user, server timestamp,
  - reason where required.
- **FR-024**: Ledger entries and posted documents MUST NOT be editable or deletable by any role or
  path. Corrections MUST be made by a reversal document that references the original, needs a
  reason, and can be applied only once per original.
- **FR-025**: Stock balances per location × batch MUST always equal the sum of ledger entries. A
  daily automated reconciliation MUST report any drift.
- **FR-026**: A posting that would make any location × batch quantity negative MUST be refused.
- **FR-027**: This feature MUST provide these document types:
  - **opening stock**: go-live only, closable,
  - **inter-location transfer**,
  - **quarantine move**,
  - **quarantine release**: only on lifting a recall block, approved by the Chief Pharmacist,
  - **stock adjustment**: from an approved count variance,
  - **reversal**.

  Later features MUST add their documents through the same framework.
- **FR-028**: Receipt-type postings MUST land in a QC Pending location. The only exception is
  opening stock declared QC-released at go-live.
- **FR-029**: The system MUST provide a batch trace: every ledger entry for a batch across all
  locations, in time order, with documents and users.
- **FR-030**: Documents MUST be numbered automatically as prefix / location code / financial year /
  running number. Numbers MUST never be typed by users and never reused, even when a draft is
  discarded.

**Allocation, FEFO and blocking**

- **FR-031**: The system MUST provide an allocation proposal per item per location. It MUST offer
  only batches that:
  - are in an allocatable location,
  - are not blocked,
  - are not expired,
  - are outside the configured do-not-issue window.

  It MUST order them by expiry date, then receipt date, then smallest quantity.
- **FR-032**: Selecting a batch other than the first FEFO batch MUST require a reason from the
  configured list. The override MUST be audit-logged and flagged for the FEFO compliance report.
- **FR-033**: An authorised user MUST be able to block a batch with a reason. A blocked batch MUST
  become non-allocatable at every location immediately, and the system MUST list the locations
  and quantities to be moved into Quarantine.
- **FR-034**: Stock MUST leave a Quarantine location only through vendor return, approved
  write-off and disposal (later features), or quarantine release on lifting a recall block.
- **FR-035**: Every quarantine move MUST record reason, date, document reference and user, as the
  quarantine tag. Quarantined stock older than the configured age (default 30 days) MUST be
  escalated to the Chief Pharmacist.

**Approvals, segregation and delegation**

- **FR-036**: Approvals MUST route by the approval matrix. A band needing more than one approver
  MUST wait for all of them.
- **FR-037**: The system MUST enforce the configurable segregation rule set listed in User Story 5,
  scenario 3. Each check MUST compare the actual people involved, not their roles. Every blocked
  attempt MUST be audit-logged.
- **FR-038**: Approvers MUST be able to set date-ranged delegation to a named deputy. The system
  MUST store both names on the approval, refuse chained delegation, and refuse delegation that
  would route an approval to the document's requester.
- **FR-039**: When no eligible approver remains after segregation and delegation rules are
  applied, the step MUST be blocked and the Chief Pharmacist alerted. It MUST never be
  auto-approved.

**Stock counts** *(subject to Q2)*

- **FR-040**: The system MUST support counts against a frozen snapshot, one mandatory recount of
  variance lines, and approval of the confirmed variance by value band with a reason code before
  an adjustment is posted. The counter MUST NOT approve their own variance.

**Audit trail**

- **FR-041**: Each of the following MUST be written to an append-only audit trail:
  - creates, changes, approvals and rejections,
  - overrides and reversals,
  - prints and exports,
  - sign-ins and failed sign-ins,
  - blocked segregation attempts.

  Each entry MUST record:
  - user, role and location,
  - workstation or device,
  - timestamp,
  - record and field,
  - old value and new value,
  - reason.
- **FR-042**: No role, including Administrator, MUST be able to edit or delete audit entries. The
  trail MUST allow any gap or tampering to be detected.
- **FR-043**: The Auditor MUST be able to search the trail by user, document, record, action type
  and date range, and export the results. The export MUST itself be logged.
- **FR-044**: Retention periods MUST follow the configured values, seeded from manual §13.5 (for
  example, audit trail 10 years). Records MUST NOT be purged before their retention period ends.

**Scale and tenancy**

- **FR-045**: The system MUST serve [NEEDS CLARIFICATION: Q1, one hospital, or several hospitals
  or units with separate data and configuration?]

### Key Entities

- **User**: a named staff account with authentication factors, status, and role assignments per
  location, signatory rights and delegation.
- **Role / Permission**: a named role (from the manual's catalogue) and the actions, approvals and
  views it allows.
- **Role Assignment**: a user + role + location, with validity dates.
- **Delegation**: approver, deputy and date range.
- **Item**: a stocked product with clinical, regulatory, storage, unit and tax attributes, and
  active status.
- **Formulary Entry**: a generic item's formulary status, approved brands and suggested
  alternatives.
- **Vendor**: legal identity (GSTIN, PAN), licences with expiry dates, contacts, bank details,
  terms, approved items, return policy and status.
- **Rate Contract**: vendor + item terms (rate, discount, tax), validity, order limits, lead time
  and ceiling.
- **Location**: a node in the store hierarchy with a type. The QC Pending, Quarantine, Return to
  Vendor and In Transit types are non-allocatable. It also has a parent, cost centre, zones, bins
  and authorised users.
- **Batch**: item + batch number + expiry, with manufacturing date, manufacturer and unit cost.
- **Stock Document**: a typed, numbered document with header and lines. It moves through Draft →
  Posted → (Reversed) and references any reversal.
- **Stock Ledger Entry**: one immutable movement of a quantity of a batch between locations,
  caused by one document line.
- **Stock Balance**: the derived quantity per location × batch. It always equals the sum of the
  ledger.
- **Batch Block**: a batch-level allocation block with reason, source (recall or expiry), user and
  lift record.
- **Master Data Change Request**: the requested change, reason, evidence, reviewer, data-owner
  approval, effective date and resulting version.
- **Configuration Item**: a named threshold or list with value, default flag, effective date and
  history.
- **Approval Matrix Rule**: document type, condition or value band, and required approver roles.
- **Segregation Rule**: a pair of duties that must not be performed by the same person on the
  same document.
- **Stock Count**: location, snapshot, counted lines, recounts, variances, reason codes and
  approval.
- **Audit Entry**: an immutable record of one audited action, with the fields in FR-041.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of stock quantities can be traced from any batch number to every movement,
  document and user, and a full trace for one batch is displayed in under 5 seconds.
- **SC-002**: Zero ways exist to change stock without a posted document. This is verified by
  attempting direct changes through every user role and every exposed operation, with all
  attempts refused and logged.
- **SC-003**: Balances match a full ledger replay with zero differences on every daily
  reconciliation run.
- **SC-004**: Zero allocation proposals include stock that is non-allocatable, blocked, expired or
  inside the do-not-issue window. This is verified across all location types and batch states.
- **SC-005**: A batch block takes effect at every location in under 1 minute from confirmation.
- **SC-006**: 100% of segregation rules in the rule set have a passing test proving that the same
  person is blocked, including users who hold every role involved.
- **SC-007**: 100% of audited action types produce a complete audit entry, and zero audit entries
  can be edited or deleted by any role.
- **SC-008**: An Administrator can onboard a new user with roles at two locations in under 3
  minutes.
- **SC-009**: A data owner can review and approve a master data change request in under 2 minutes.
- **SC-010**: Every threshold that later features need is present as configuration with a default
  value, so no feature needs a code change to adjust one. This is verified by an inventory of
  §4.7 and §4.8 against the configuration.
- **SC-011**: Go-live opening stock for 5,000 batch lines across all locations can be loaded and
  reconciled in a single working day.

## Assumptions

- Patient data is not created or stored by this feature. Patient-facing role restrictions are
  defined here (FR-005, FR-006) and applied by later features.
- Barcode or handheld capture is not required in this feature. Stock documents and counts can be
  entered on standard screens. Scanning support is deferred.
- Cold-chain temperature monitoring and sensor integration are out of scope. Storage condition and
  cold-chain zones are captured as master data only.
- Reorder parameters are stored and the formulas displayed. Automatic weekly recalculation from 90
  days of issues is delivered with Procurement (002), when issue history exists.
- Single sign-on is optional (FR-007). Named accounts with the manual's password and MFA rules are
  the baseline.
- The hospital time zone is Asia/Kolkata (configurable). The financial year runs April–March for
  document numbering.
- Valuation is at batch cost (landed cost per issue unit). GST capture on master data is in
  scope. Tax computation on invoices is delivered with feature 007.
- Backup, recovery point objective, recovery time objective and restore testing (manual §16.5) are
  hosting and operations requirements. They will be addressed in the plan, not as user-facing
  features.
- Notifications in this feature (alerts to the Chief Pharmacist, Internal Audit and approvers) are
  in-app. Email and SMS come with feature 008.
- All values the manual marks as recommended defaults are seeded as configuration and must be
  confirmed by the hospital before go-live, as the Domain Reference requires.
