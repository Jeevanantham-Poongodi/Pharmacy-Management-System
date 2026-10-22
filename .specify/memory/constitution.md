# Hospital Pharmacy Management System (India) Constitution

## Core Principles

### I. Batch-Level Traceability

Every stock quantity in the system MUST be identified by the full key
**item + batch number + expiry date + location**.

- The system MUST NOT store, display or post a quantity at item level only. Item-level figures
  are only allowed as derived aggregates of batch-level rows.
- Every receipt, issue, transfer, return, dispense, adjustment and write-off line MUST reference
  a specific batch and location.
- From a batch number, the system MUST be able to trace the batch forward (to the ward, patient
  or department it went to) and backward (to the GRN and supplier it came from).

**Rationale**: Recalls, expiry control, NDPS registers and Drugs & Cosmetics Act inspections all
need batch-level answers. Item-level stock cannot answer "where did batch X go?"

### II. Document-Driven, Append-Only Stock Ledger

Stock MUST change only when a stock document is posted. The document types are GRN, issue,
transfer, return, adjustment and write-off.

- Every posted document MUST record the posting user, server timestamp, document type and a
  reason. A reason is required for adjustments, write-offs, returns and any override.
- The stock ledger MUST be append-only. Ledger rows MUST NOT be updated or deleted at the
  application or database layer.
- A posted document MUST NOT be edited. To correct it, post a reversing document that references
  the original, then post a new document if needed.
- A document and all its ledger lines MUST post in one database transaction (Principle XIII).
- On-hand balances MUST be derivable by replaying the ledger. Cached balances MUST reconcile to
  the ledger, and an automated check MUST detect any drift.
- No API, script, migration or admin screen may change stock outside this document flow.

**Rationale**: Silent stock changes hide pilferage and errors. An immutable ledger with reversals
is the only defensible audit position.

### III. Quarantine Is a Location

Stock that is quarantined, QC-pending, expired or recalled MUST be held in dedicated
non-allocatable locations. A status flag on available stock is not enough.

- Moving stock into or out of these locations MUST be a posted transfer document (Principle II)
  with a reason.
- Allocation, picking, issue and dispense logic MUST exclude non-allocatable locations. The
  exclusion MUST be enforced in the domain/data layer, not only in the UI.
- When a batch passes its expiry date or a recall is raised, the system MUST block it from
  allocation immediately, even before the physical move.
- Releasing stock from QC or quarantine MUST require an authorised user and a recorded
  disposition.

**Rationale**: A flag is easy to miss in one query. A location boundary makes dispensing unsafe
stock structurally impossible.

### IV. FEFO Allocation

Every issue and dispense MUST allocate by **First-Expiry-First-Out** across allocatable batches
(`F2:"Issue approved quantity, earliest expiry first"`, `F3:"Dispense from earliest-expiry
batch"`).

- The system MUST propose the FEFO batch by default.
- The FEFO order MUST be deterministic, in three steps:
  1. earliest expiry date first;
  2. if expiry dates match, earliest GRN posting date first;
  3. if both match, lowest batch record ID first.
- Each step of this order MUST have an acceptance test, and the same request MUST always produce
  the same batch order (decision D-005 in `docs/decisions.md`).
- Whether a user may choose a batch other than the FEFO batch (an override) is pending (decision
  D-011). Until it is decided, the system MUST NOT offer overrides. If overrides are approved,
  each one MUST record the user, a reason and a timestamp, and MUST be audited (Principle VII).
- Expired batches MUST NOT be allocated. Whether a batch is allocatable on its expiry date, and
  whether there is a "do not dispense" window before expiry, are pending (decision D-012). Until
  D-012 is decided, a batch MUST NOT be allocated on or after its expiry date.
- When one batch cannot cover the quantity, allocation takes the remainder from the next batches
  in FEFO order (decision D-013).
- The system MUST NOT allocate more than the allocatable quantity, and a balance MUST NEVER go
  negative. An uncovered remainder is reported as a shortfall; what happens next follows the
  flow diagram (`F2:"Enough stock in pharmacy?"`, `F3:"In stock?"`).
- Allocation MUST be safe under concurrent requests (Principle XIII).

**Rationale**: FEFO keeps expiry losses low; the diagram also flags near-expiry stock for "FEFO
priority issue". A deterministic order makes allocation testable and repeatable.

### V. Segregation of Duties

The system MUST enforce these separations. Policy alone is not enough.

- The user who raises a request or document MUST NOT approve it.
- The two signatories of an NDPS / Schedule X dual sign-off MUST be two different users
  (Principle VI).
- Further separation rules (for example between the users who create a purchase order, post its
  receipt and release its payment) are pending (decision D-014). Once approved, they MUST be
  configured rules that the system enforces.
- Checks MUST compare user identity, not just role, so one user holding several roles cannot
  bypass them.
- Checks MUST run in the backend domain layer. UI checks are a convenience only.
- Breaking glass in an emergency (if a feature allows it) MUST be configurable, need a reason,
  raise an alert and be reviewed afterwards.

**Rationale**: SoD prevents fraud and single-point errors in procurement, payment and controlled
drugs.

### VI. NDPS / Schedule X Controls

The flow diagram requires an NDPS register entry and dual sign-off before a narcotic or
Schedule X medicine is dispensed: `F3:"Narcotic or Schedule X?"` → `F3:"NDPS register entry,
dual sign-off"` → `F3:"Dispense from earliest-expiry batch"`.

- Items MUST carry a narcotic / Schedule X classification so the system can apply this branch.
- The dispense MUST NOT post until the register entry exists and two different authenticated
  users have signed off (Principle V).
- The register entry, both sign-offs, the stock posting and their audit entries MUST commit in
  one database transaction (Principle XIII). If any part fails, nothing is posted.
- The register MUST be append-only.
- Pending under decision D-004 (compliance owner), and not to be invented by any spec: which
  other movements need a register entry or dual sign-off (for example receipt, transfer, return
  or destruction), the register's content and format, retention, and reconciliation rules.

**Rationale**: Controlled medicines carry record-keeping duties. The diagram fixes the dispense
branch; the full set of duties is confirmed by the compliance owner.

### VII. Append-Only Audit Trail

An append-only audit trail MUST record every create, change, approval, rejection, override,
reversal, login-sensitive action and data export.

- Each entry MUST capture actor, timestamp, action, entity, before and after values (for
  changes) and reason where one applies.
- Audit records MUST NOT be editable or deletable through any application path. The append-only
  rule MUST also be enforced by database permissions, not only by application code.
- Read access to the audit trail MUST be limited to authorised roles. The audit trail SHOULD be
  tamper-evident (for example, each entry linked to the previous one by a hash).
- Retention MUST follow configured periods. The periods themselves are pending (decision D-004).
- Audit entries MUST NOT hold more patient data than the action needs (Principle X).
- Exports MUST log who exported which data set, with which filters, and when.

**Rationale**: Audits, inspections and DPDP accountability all depend on a trustworthy history.

### VIII. Configuration Over Hard-Coding

Every business threshold MUST be configuration, never a literal in code.

- Examples: the expiry alert windows (the diagram shows 90, 60 and 30 days at
  `F4:"Within 90, 60 or 30 days?"`), reorder levels (`F1:"Stock below reorder level or
  department need"`) and any approval limits that are approved.
- Configuration MUST be scoped per hospital (see Regulatory & Domain Constraints).
- Configuration changes MUST be audited (Principle VII). Where they affect controls, they MUST
  need approval.
- Defaults MUST be documented. Code MUST read thresholds from configuration at runtime.

**Rationale**: Each hospital and each formulary sets different limits. Hard-coded values cause
silent policy drift.

### IX. Test-First (NON-NEGOTIABLE)

Tests MUST be written and seen to fail before the implementation is written.

- Every decision branch in the flow diagram that a feature implements MUST have at least one
  automated test. This includes approve/reject, SoD violations, FEFO ordering, quarantine
  blocks and NDPS dual sign-off.
- Each feature MUST keep a branch-to-test map that lists every branch it implements, by its
  diagram node reference (for example `F1:"Formulary item?"`), and every functional requirement
  (FR-xxx), with the test(s) covering each. An unmapped branch or requirement blocks the feature
  from being marked complete.
- Every principle that says "MUST NOT" MUST have a negative test proving the forbidden action is
  rejected.
- Every API endpoint MUST have a contract test against its OpenAPI contract (Principle XII).
- Ledger immutability, register reconciliation, transaction rollback, idempotency, concurrent
  allocation, tenant isolation and audit-trail writes MUST have integration tests that run
  against the real persistence layer.

**Rationale**: For controls that carry regulatory weight, "it works" is not evidence. Tests are.

### X. Patient Data Minimisation (DPDP Act 2023)

Patient personal data MUST be limited to what each pharmacy function needs.

- Access MUST be role-restricted. Each role MUST see only the fields its job requires.
- Patient identifiers in reports, exports and logs MUST be masked or pseudonymised unless a role
  needs the full value.
- Purpose, consent or legitimate-use basis, retention and erasure handling MUST be designed to
  support the Digital Personal Data Protection Act 2023 obligations confirmed under decision
  D-004. Erasure MUST NOT break registers the law requires to be kept; pseudonymise instead.
- Patient data MUST NOT appear in non-production environments unless it is anonymised.

**Rationale**: Pharmacy records reveal diagnoses, so patient data needs the least exposure that
still lets the work be done. The exact legal obligations are confirmed under D-004.

### XI. Modular Domains on a Shared Foundation

The system MUST be built as five flow domains (procurement, ward indent, patient dispensing,
expiry, recall) on one shared **Foundation**. Foundation owns locations, items, batches, the
stock ledger and stock documents, FEFO allocation, approvals, segregation of duties, users and
roles, configuration and the audit trail.

- The backend MUST be layered: **API routes** (HTTP, validation, auth context) → **domain
  services** (all business rules) → **repositories** (data access). Business rules MUST NOT live
  in routes, repositories, SQL triggers or the UI, except database constraints that back up a
  domain rule.
- A domain MUST change stock only through Foundation's stock-document services. It MUST NOT
  write another domain's tables directly.
- Domains interact only through documented contracts: service interfaces inside the backend, and
  API contracts at the HTTP boundary (Principle XII). Synchronous calls are the default. An
  asynchronous mechanism (queue, events) is a technology change and needs an amendment.
- The frontend MUST keep the same separation: API clients, state and business-free UI
  components.

**Rationale**: All five flows move the same stock. One shared ledger and allocation engine keeps
stock consistent across them. Clear boundaries let several developers work in parallel without
breaking each other.

### XII. Contract-First, Idempotent APIs

- APIs MUST be REST over JSON, under `/api/v1`.
- Every request and response MUST be validated with Pydantic models. Invalid input MUST be
  rejected with a 4xx response before any domain logic runs.
- The OpenAPI contract in `specs/NNN-feature/contracts/` is the source of truth. It MUST be
  agreed before backend and frontend work on it starts. The running service MUST match it,
  checked by contract tests.
- Errors MUST use one envelope: `{"error": {"code", "message", "details", "request_id"}}`, with
  stable machine-readable codes.
- **Idempotency**: every request that posts a stock document, records an approval or signs an
  NDPS entry MUST carry an `Idempotency-Key` header. A missing key MUST be rejected.
  - A key is scoped to the hospital, the authenticated user and the operation.
  - Same key, same payload, original request completed: the stored original result MUST be
    returned, and nothing new is posted.
  - Same key, different payload: the request MUST be rejected with `IDEMPOTENCY_KEY_REUSED`,
    and nothing is posted.
  - Same key while the original request is still running: the request MUST be rejected with
    `REQUEST_IN_PROGRESS`, and nothing is posted. Concurrent requests with the same key MUST
    NOT both execute.
  - An attempt that fails or rolls back MUST NOT be recorded as completed, so a retry is safe.
  - A database uniqueness constraint on the posted document's idempotency key MUST back up these
    checks. How long keys are kept is configuration.
- **Backward compatibility**: adding optional fields or endpoints is allowed within a version.
  Removing or renaming a field, changing its meaning or tightening validation is a breaking
  change. It MUST go into a new API version (`/api/v2`) with a migration plan, and the old
  version MUST keep working until the frontend has moved.

**Rationale**: Agreed contracts let frontend and backend develop in parallel. Idempotency stops a
double-click or network retry from issuing stock twice.

### XIII. All-or-Nothing Transactions and Explicit Errors

- A stock document, its ledger lines, any register entries and its audit entries MUST commit in
  one database transaction. On any failure, nothing is posted.
- Allocation MUST be safe under concurrent requests. Two users MUST NOT be able to allocate the
  same quantity. Allocation and posting MUST lock the batch-location balances they depend on,
  and the database MUST reject any negative balance, so concurrent requests can never issue
  more than is available.
- Exceptions MUST NOT be swallowed. Every failure MUST be logged with its request ID and returned
  to the user as a clear error (Principle XII envelope). Internal details and patient data MUST
  NOT appear in user-facing messages.

**Rationale**: A half-posted document corrupts stock in a way no reconciliation can explain.

### XIV. End-to-End Traceability

Every requirement MUST be traceable from the flow diagram or an approved decision to the code
that implements it and the tests that prove it.

- Specs MUST give requirements stable IDs (FR-xxx) and cite the diagram nodes and approved
  decisions they implement.
- Plans MUST map requirements to components and contracts. Tasks MUST reference the requirement
  or user story they serve.
- Commits and pull requests MUST reference the feature (NNN) and the task IDs they deliver.
- When a requirement changes, the spec MUST change first, then the plan, tasks and tests.

**Rationale**: Inspectors and the drug committee need to see why the system behaves as it does.
Traceability also shows the team what a change affects.

## Regulatory & Domain Constraints

- The system is intended for hospitals in India. Laws likely to apply include the Drugs and
  Cosmetics Act 1940 and its Rules (including Schedules H, H1 and X), the NDPS Act 1985, the
  DPDP Act 2023 and GST rules for purchase and billing documents. Which apply, and how, is
  confirmed under decision D-004.
- **Engineering controls, not verified compliance**: the controls in this constitution
  (auditability, batch traceability, NDPS controls, segregation of duties, DPDP privacy) are
  engineering requirements written to support compliance. They are not a statement that the
  system is legally or regulatorily compliant, and no document in this repository may claim so.
  The hospital's designated compliance owner MUST confirm the applicable legal and regulatory
  requirements before production go-live (decision D-004, pending sign-off).
- Every date-sensitive rule (expiry, alert windows, register periods) MUST use a single
  configured hospital time zone (default Asia/Kolkata). Timestamps MUST be stored unambiguously.
- Registers and reports MUST be reproducible for any past date from the ledger and audit trail.
- Deleting master data (items, batches, suppliers, locations) that has ledger history MUST NOT
  be possible. Only deactivation is allowed.
- **Tenancy** (decision D-006, approved): the system serves one hospital now. Every business
  table MUST carry a `hospital_id`, every query and RLS policy MUST filter by it, and
  configuration MUST be scoped by it, so more hospitals can be added later without redesign.
  Isolation is enforced as described under Technology Constraints → Tenant isolation.

## Business-Process Reference

The flow diagram **Hospital_Pharmacy_System_Flow_v2**, stored at
`docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf`, is the **primary business-process reference**
for this system (decision D-010). No other document defines business workflows. The earlier
process manual is retired and MUST NOT be used as a source.

- **Citing the diagram**: requirements cite diagram nodes as `F<flow>:"<exact node label>"`, for
  example `F1:"Formulary item?"` or `F3:"NDPS register entry, dual sign-off"`. The labels are
  fixed in v2 of the diagram, so these references are stable.
- **Gaps**: where the diagram does not show a business rule, the spec MUST record the gap. It
  MUST NOT invent the rule. A gap is raised as a clarification question when it blocks a safe
  decision; otherwise it is recorded as an open item or a named assumption.
- **Conflicts**: if the diagram conflicts with an approved engineering or security constraint
  (this constitution or an approved decision), neither silently overrides the other. The spec
  MUST mark the affected requirement **BLOCKED: conflict**, describe both sides, and raise it for
  clarification. Work on that requirement stops until it is resolved.
- **Engineering constraints still apply where the diagram is silent**: every "stock" box is a
  posted document (Principle II), every approval node is a segregated approval (Principle V), and
  every quarantine box is a move to a quarantine location (Principle III).

The diagram shows five flows:

1. **Procurement**: purchase requisition to central store. Covers the formulary check, drug
   committee review, HOD approval, rate contract or RFQ with comparative statement, Finance PO
   approval, vendor response, GRN check, QC, stock in central store, invoice match and payment,
   and emergency local purchase.
2. **Ward indent**: pharmacy to ward, OT or ICU, including the stock check, FEFO issue, ward
   receipt reconciliation and ward returns.
3. **Patient dispensing**: inpatient (IP) and outpatient (OP) orders. Covers pharmacist
   verification, prescriber query, substitution, NDPS/Schedule X branch, FEFO dispense, IP or
   OP billing, and patient returns.
4. **Expiry management**: daily scan against the 90/60/30-day windows, redeployment or vendor
   return, near-expiry watch list, expired quarantine, write-off approval and disposal.
5. **Recall**: find affected batches, block and quarantine them, trace patients if the batch
   was already dispensed, and return to the vendor.

Rules that apply across the flows:

- **Scope**: features MUST trace to one or more of these flows or to an approved decision. Work
  outside them needs a flow amendment first (see Governance).
- **Fidelity**: every decision node and outcome in the flows MUST exist in the system. This
  includes rejection, resubmission, revision and escalation loops. A branch MUST NOT be dropped
  or merged without an amendment.
- **GRN to QC** (Flow 1): goods that pass the GRN check go to `F1:"Quarantine for QC"` and become
  allocatable only after `F1:"QC passed?"` is Pass (Principle III).
- **Emergency local purchase** (Flow 1): the diagram shows `F1:"Emergency local purchase"` →
  `F1:"Retrospective approval?"` → Approved → `F1:"Stock in central store"`, or Rejected →
  `F1:"Escalate to audit"`.
  - Stock enters only through a posted receipt document (Principle II).
  - The retrospective approver MUST be a different user from the purchaser (Principle V).
  - Whether the GRN check and QC also apply to an emergency purchase is not shown in the diagram.
    The procurement feature MUST raise it as a clarification.
- **Returns from wards and patients** (Flows 2 and 3): a return is accepted into allocatable
  stock only after a recorded "sealed, unexpired, cold chain OK?" check. Rejected returns go to a
  quarantine location for disposal (Flow 4).
- **Recall patient tracing** (Flow 5): tracing which patients received a batch is a permitted
  purpose under Principle X. Access is limited to the roles that handle recalls, and every trace
  is audited.

**Rationale**: One pharmacy-owned diagram keeps every spec tied to how the hospital works.
Recording gaps and conflicts openly stops rules from being invented.

## Technology Constraints

- **Repositories**: three Git repositories, with matching feature branch names (`NNN-short-name`)
  in each:
  - root specs repo: `.specify/`, `.claude/`, `specs/`, `docs/`;
  - **PMS-backend** (`backend/`);
  - **PMS-frontend** (`frontend/`).
- **Frontend**: React 19 + TypeScript (strict mode), built with Vite.
  - **Hosting is pending confirmation** (decision D-003). Vercel is a candidate, not a decision.
    The frontend host is decided separately from the backend's Docker/EC2 deployment.
  - On any host, the frontend MUST NOT hold privileged credentials, and MUST NOT persist patient
    data outside the approved data region, for example through server-side functions or caches.
- **Backend**: Python 3.12, FastAPI, run in Docker. The image is built by GitHub Actions, stored
  in GHCR and deployed to AWS EC2. Moving to another AWS service or host is a technology change.
- **Data, auth and files**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage).
  - Authentication uses Supabase Auth. The backend verifies the user's token on every request
    and enforces role × location access itself.
  - Schema changes MUST be versioned migration files in the backend repo. Manual schema changes
    in the Supabase dashboard MUST NOT be made in any shared environment.
  - Database names MUST be snake_case; tables are plural nouns.
- **Write path**: every business write MUST go through the FastAPI backend. This includes stock
  movements and other stock documents, approvals, NDPS/Schedule X entries, configuration changes
  and audit entries. The browser MUST NOT write directly to Supabase tables or storage for these.
  The Supabase service-role key MUST exist only on the backend.
- **Read path** (decision D-001, approved): FastAPI is the only application data-access path
  for the browser. All browser reads and writes go through it.
  - The frontend MUST NOT query Supabase tables, views, RPC functions or storage.
  - The frontend MAY use the Supabase JS client for **Supabase Auth only**: sign-in, session
    refresh, sign-out and MFA. It sends the resulting access token to FastAPI as a bearer token.
  - Any future exception MUST be an amendment with a written justification and a security and
    architecture review.
- **Tenant isolation**:
  - The hospital scope of a request MUST come from the authenticated user's membership, checked
    by the backend. A hospital ID supplied by the client MUST NOT be trusted on its own.
  - The backend MUST authorise every request (role × location × hospital). Filtering in the
    frontend MUST NOT be relied on for security.
  - Database access made on behalf of a user MUST run under that user's identity, so RLS
    policies apply.
  - The service-role key bypasses RLS. It MAY be used only by named system jobs that set the
    hospital scope explicitly, are documented in the feature plan, and are audited.
  - Every hospital-scoped endpoint MUST have a negative test proving that a user cannot read or
    change another hospital's data.
- **Defence in depth**: Supabase Row Level Security (RLS) MUST be enabled on every table, with
  explicit policies. A table without RLS MUST fail CI or migration review. RLS is an extra layer
  and does not replace backend authorisation (Principles V and X).
- **Data residency** (decision D-002, pending verification): the actual region of the Supabase
  project and the EC2 instance is not verified. ap-south-1 (Mumbai) is the proposed target, to
  keep patient data in India; it is not confirmed.
  - The region MUST be deployment configuration (environment variables and settings). Code MUST
    NOT hard-code a region.
  - Production go-live MUST NOT happen until the actual regions are verified and recorded in
    D-002.
- **Operational safety** (no numeric targets are set here):
  - **Secrets** MUST live only in environment configuration or GitHub secrets, never in a
    repository. `.env` files MUST NOT be committed. A secret that is exposed MUST be rotated.
  - **Backups**: the database MUST have backups enabled, and a restore MUST be tested before
    production go-live. Recovery point and recovery time targets are pending (decision D-015).
  - **Monitoring**: logs MUST be structured and carry the request ID. The backend MUST expose a
    health check. Failed postings and ledger-drift check failures MUST raise alerts.
  - **Logs** MUST NOT contain secrets, tokens or patient identifiers beyond pseudonymous IDs.
- **Coding standards**:
  - Python: PEP 8, enforced with ruff (lint and format); type hints on all public functions.
  - TypeScript: strict mode, linted with oxlint; no `any` without a comment explaining why.
  - Names follow each language's convention. Domain terms (GRN, indent, FEFO, NDPS) MUST match
    the flow diagram's wording.
- **Testing**:
  - backend: pytest,
  - frontend: Vitest + React Testing Library,
  - end-to-end flows: Playwright.
- **Technology changes**: adding or replacing a language, framework, hosting provider, database,
  auth provider, messaging mechanism or test framework requires a constitution amendment (see
  Governance).

**Rationale**: Routing every write through one backend keeps Principles II, V, VI, VII and XIII
enforceable in one place. RLS limits the damage if a key leaks or a policy is missed. Keeping
the region as configuration lets it be corrected without code changes once it is verified.

## Development Workflow & Quality Gates

- Every feature MUST follow the Spec Kit sequence: specify → clarify → plan → tasks →
  analyze → implement. Each feature folder MUST keep `spec.md`, `plan.md`, `tasks.md`,
  `contracts/` and `quickstart.md` current. Each code repo MUST keep its README current.
- Features are developed one at a time. The next feature's boundaries are set from the flow
  diagram after the previous feature is approved.
- Every feature spec MUST name the flows and diagram nodes it implements and the approved
  decisions it relies on. Plans MUST map each implemented branch to its tests (Principle IX),
  written in the mandated tools: pytest, Vitest + React Testing Library, and Playwright. Each
  end-to-end path through a flow MUST have a Playwright test.
- The plan's **Constitution Check** gate MUST evaluate Principles I–XIV, the Business-Process
  Reference and the Technology Constraints explicitly. Any deviation MUST be recorded in the
  plan's Complexity Tracking with a justification and an approver.
- Specs and plans are reviewed as pull requests in the root repo and need the project owner's
  approval before implementation starts.
- Code review MUST confirm that:
  - no stock mutation bypasses documents,
  - no business write bypasses the FastAPI backend,
  - the frontend reads no Supabase tables, views, RPC functions or storage (Supabase Auth only),
  - business rules sit in the domain layer,
  - posting endpoints require an idempotency key and run in one transaction,
  - every new table has RLS enabled and a `hospital_id`,
  - hospital scope comes from the authenticated user, not from the client,
  - no thresholds are hard-coded,
  - SoD checks compare user identity,
  - audit entries are written for new actions,
  - patient fields are role-restricted, and logs hold no secrets or patient identifiers.
- CI MUST block merges when tests fail, lint fails, a contract test fails, ledger/audit
  immutability tests fail, a required negative test is missing, or a table lacks RLS.
- **Decisions**: project decisions and their status are recorded in `docs/decisions.md`. A
  decision marked pending MUST NOT be described as confirmed in any spec, plan or document.
- **Production go-live gate**: production go-live MUST NOT happen while any of these are open:
  D-002 (data region verified), D-003 (frontend hosting confirmed), D-004 (compliance owner
  sign-off), D-015 (backup and recovery targets) or D-016 (exposed frontend configuration).

## Governance

- This constitution is a **draft and is not ratified**. It takes effect when the project owner
  explicitly approves it, and that approval is recorded in `docs/decisions.md`. Until then, the
  project owner approves every change to it.
- After ratification, this constitution supersedes all other project practices. Specs, plans,
  tasks and code that conflict with it MUST be changed, or the constitution MUST be formally
  amended first.
- **Amendments** MUST be written as a documented proposal stating the change, rationale, impact
  and migration plan. They are approved by the project owner. The proposed approvers for
  business and technical content (for example a chief pharmacist and a tech lead) take this role
  once the project owner names them and records it in `docs/decisions.md`. Adding or replacing
  technology (see Technology Constraints) is an amendment. So is changing the flow diagram: a new
  version (for example v3) MUST be committed alongside the amendment, and the version it replaces
  MUST be kept in the repository.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle or governance rule is removed or redefined incompatibly.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications and wording changes.
- Every amendment MUST update the version line and the Last Amended date.
- **Compliance review**: every plan and pull request MUST verify compliance with this
  constitution.

**Version**: 1.0.0 (draft, not ratified) | **Ratified**: pending | **Last Amended**: 2026-10-22
