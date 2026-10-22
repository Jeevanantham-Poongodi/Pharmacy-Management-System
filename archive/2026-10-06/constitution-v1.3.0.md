<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0 → 1.1.0 → 1.2.0 → 1.3.0 (all on 2026-10-06)

1.0.0 — First ratification
  Template placeholders replaced:
    - [PRINCIPLE_1_NAME] → I. Batch-Level Traceability
    - [PRINCIPLE_2_NAME] → II. Document-Driven, Append-Only Stock Ledger
    - [PRINCIPLE_3_NAME] → III. Quarantine Is a Location
    - [PRINCIPLE_4_NAME] → IV. FEFO Allocation
    - [PRINCIPLE_5_NAME] → V. Segregation of Duties
  Principles added beyond the 5-slot template: VI. NDPS / Schedule X Controls,
    VII. Append-Only Audit Trail, VIII. Configuration Over Hard-Coding,
    IX. Test-First (NON-NEGOTIABLE), X. Patient Data Minimisation (DPDP Act 2023)
  Sections filled: Regulatory & Domain Constraints ([SECTION_2_NAME]),
    Development Workflow & Quality Gates ([SECTION_3_NAME]), Governance

1.1.0 — MINOR: new section added
  Added sections:
    - Technology Constraints (frontend, backend, data/auth, write path, RLS, hosting region,
      testing stack, technology-change rule)
  Modified sections:
    - Development Workflow & Quality Gates: names the mandated test tools; code review also
      checks the write path and RLS
    - Governance: adding or replacing technology requires an amendment
  Modified principles: none
  Removed sections: none

1.2.0 — MINOR: new section added, guidance materially expanded
  Added sections:
    - Reference Flows: makes Hospital_Pharmacy_System_Flow_v2 (Flows 1–5) the canonical,
      in-scope process definition and ties flow-specific paths (emergency local purchase,
      GRN → QC quarantine, returns inspection, recall patient tracing) to the principles
  Modified principles:
    - IX. Test-First: "flow diagrams" now means the Reference Flows; requires a branch-to-test map
  Modified sections:
    - Development Workflow & Quality Gates: specs MUST name the flow(s) and branches they cover
    - Governance: changes to the Reference Flows follow the amendment procedure
  Removed sections: none
  Resolved TODO: canonical flow diagrams are now defined (was a 1.0.0 follow-up)

1.3.0 — MINOR: new section added
  Added sections:
    - Domain Reference: docs/reference/pms-manual/ (PMS-OPS-MAN-002 v2.0) is the authoritative
      business-process reference; specs follow its flows, statuses and business rules;
      Appendix E recommended defaults are configuration; the constitution wins on conflict
  Modified principles:
    - IX. Test-First: branch IDs are the manual's Appendix D decision IDs (D1.1–D5.1)
  Modified sections:
    - Reference Flows: the manual elaborates the flows; Appendix D IDs are the branch IDs
    - Development Workflow & Quality Gates: specs cite the manual chapters they implement
  Removed sections: none
  Resolved TODO: TODO(BRANCH_IDS). The manual's Appendix D already gives stable decision IDs

Templates reviewed (read at runtime, not modified by this command):
  - .specify/templates/plan-template.md: "Technical Context" MUST match Technology Constraints;
    "Constitution Check" MUST check Principles I–X, Domain Reference, Reference Flows and
    Technology Constraints
  - .specify/templates/spec-template.md: no change required; specs cite manual chapters and
    Appendix D decision IDs in their user stories
  - .specify/templates/tasks-template.md: test-first ordering matches Principle IX

Follow-up TODOs:
  - TODO(FLOW_FILE): commit Hospital_Pharmacy_System_Flow_v2.pdf to
    docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf. It is not in the repo yet. The manual's
    images/ folder has diagrams redrawn from it, but not the source PDF itself.
  - The manual's approval table (00-document-control.md) is unsigned. Until it is signed, the
    manual is a draft reference.
  - The ratification date is the date of first adoption (2026-10-06). Correct it if the
    Chief Pharmacist and tech lead formally sign off on a different date.
  - Whether the browser may READ directly from Supabase (under RLS) or must read through
    FastAPI is not decided yet. Settle this in the first plan, or by amendment.
-->

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

Every issue and dispense MUST allocate by **First-Expiry-First-Out** across allocatable batches.

- The system MUST propose the FEFO batch by default.
- Choosing a different batch is an override. It MUST record the user, a reason from a configured
  reason list (plus free text if needed) and a timestamp, and it MUST be audited (Principle VII).
- When several batches share the same expiry date, the tie-break rule MUST be deterministic and
  documented.
- Batches inside the configured "do not dispense" expiry window MUST NOT be allocated.

**Rationale**: FEFO keeps expiry write-offs low and patients safe. Unrecorded overrides defeat it.

### V. Segregation of Duties

The system MUST enforce these separations. Policy alone is not enough.

- The user who raises a request or document MUST NOT approve it.
- The user who creates a purchase order, the user who posts its GRN and the user who releases
  its payment MUST be three different users.
- The NDPS dispenser MUST NOT be the second signatory for the same transaction.
- Checks MUST compare user identity, not just role, so one user holding several roles cannot
  bypass them.
- Breaking glass in an emergency (if a feature allows it) MUST be configurable, need a reason,
  raise an alert and be reviewed afterwards.

**Rationale**: SoD prevents fraud and single-point errors in procurement, payment and controlled
drugs.

### VI. NDPS / Schedule X Controls

Every movement of Narcotic Drugs and Psychotropic Substances (NDPS) and Schedule X drugs MUST
have dual sign-off and MUST update a running register.

- This covers receipt, transfer, issue, dispense, return, destruction and adjustment.
- Every movement MUST be signed by two distinct authenticated users (Principle V).
- The system MUST keep a running per-drug, per-location register with opening balance,
  movement, closing balance, counterparty and prescription/indent reference. The register MUST
  be append-only and printable in the statutory format.
- Register balances MUST reconcile to the stock ledger. A mismatch MUST block further movement of
  that drug at that location until it is resolved.

**Rationale**: NDPS Act 1985 and Drugs & Cosmetics Rules impose statutory record-keeping.
Failures carry criminal liability.

### VII. Append-Only Audit Trail

An append-only audit trail MUST record every create, change, approval, rejection, override,
reversal, login-sensitive action and data export.

- Each entry MUST capture actor, timestamp, action, entity, before and after values (for
  changes) and reason where one applies.
- Audit records MUST NOT be editable or deletable through any application path. Retention MUST
  follow configured statutory periods.
- Exports MUST log who exported which data set, with which filters, and when.

**Rationale**: Audits, inspections and DPDP accountability all depend on a trustworthy history.

### VIII. Configuration Over Hard-Coding

Every business threshold MUST be configuration, never a literal in code.

- Examples: approval limits, expiry alert windows (default 90/60/30 days), "do not dispense"
  windows, reorder levels, min/max stock, GRN quantity and price tolerances, and SoD bypass
  rules.
- Configuration changes MUST be audited (Principle VII). Where they affect controls, they MUST
  need approval.
- Defaults MUST be documented. Code MUST read thresholds from configuration at runtime.

**Rationale**: Each hospital and each formulary sets different limits. Hard-coded values cause
silent policy drift.

### IX. Test-First (NON-NEGOTIABLE)

Tests MUST be written and seen to fail before the implementation is written.

- Every decision branch in the Reference Flows (see that section) MUST have at least one
  automated test. This includes approve/reject, SoD violations, FEFO overrides, quarantine
  blocks, tolerance breaches and NDPS dual sign-off.
- Each feature MUST keep a branch-to-test map that lists every branch it implements, by its
  Appendix D decision ID (e.g. D1.3) from the Domain Reference, and the test(s) covering it.
  An unmapped branch blocks the feature from being marked complete.
- Every principle above that says "MUST NOT" MUST have a negative test proving the forbidden
  action is rejected.
- Ledger immutability, register reconciliation and audit-trail writes MUST have integration
  tests that run against the real persistence layer.

**Rationale**: For controls that carry regulatory weight, "it works" is not evidence. Tests are.

### X. Patient Data Minimisation (DPDP Act 2023)

Patient personal data MUST be limited to what each pharmacy function needs.

- Access MUST be role-restricted. Each role MUST see only the fields its job requires.
- Patient identifiers in reports, exports and logs MUST be masked or pseudonymised unless a role
  needs the full value.
- Purpose, consent or legitimate-use basis, retention and erasure handling MUST follow the
  Digital Personal Data Protection Act 2023. Erasure MUST NOT break statutory registers.
  Pseudonymise instead where the law requires the record to be kept.
- Patient data MUST NOT appear in non-production environments unless it is anonymised.

**Rationale**: This is a legal obligation and preserves patient trust. Pharmacy records reveal
diagnoses.

## Regulatory & Domain Constraints

- The system operates under Indian law. This includes the Drugs and Cosmetics Act 1940 and its
  Rules (including Schedules H, H1 and X), the NDPS Act 1985, the DPDP Act 2023 and applicable
  GST rules for purchase and billing documents.
- Every date-sensitive rule (expiry, alert windows, register periods) MUST use a single
  configured hospital time zone (default Asia/Kolkata). Timestamps MUST be stored unambiguously.
- Statutory registers and reports MUST be reproducible for any past date from the ledger and
  audit trail.
- Deleting master data (items, batches, suppliers, locations) that has ledger history MUST NOT
  be possible. Only deactivation is allowed.

## Domain Reference

The **PMS Process & Operations Manual** (PMS-OPS-MAN-002, v2.0) in `docs/reference/pms-manual/`
is the authoritative business-process reference for this system.

- **Specs follow the manual**: they MUST follow its flows, steps, decisions, loops, document
  statuses and status lifecycles, and its business rules and validations. The flow chapters
  (05–09) define steps, decisions and statuses, and chapter 13 defines status lifecycles. A spec
  MUST NOT invent a status, skip a step or relax a business rule the manual defines, unless an
  amendment allows it.
- **Specs cite their sources**: each spec MUST list the manual chapters it implements, as mapped
  in the manual's README, and the Appendix D decision IDs it covers.
- **Recommended defaults are configuration**: values the manual marks as recommended defaults
  (Appendix E, and the default values in chapter 4) MUST be implemented as configuration, never as
  hard-coded constants. This covers approval limits, time targets, KPIs, recall classes,
  numbering formats, retention periods and shelf-life minimums (Principle VIII). Code and specs
  MAY ship them as seed defaults.
- **Constitution wins**: if the manual conflicts with this constitution, the constitution wins.
  The spec MUST record the conflict and the rule it applied.
- **Technology**: technology choices implied by the manual are ignored. The stack is defined in
  Technology Constraints.
- **Changing the manual**: the manual is changed only through its own document control
  (00-document-control.md and its §4.9 change control). Specs MUST use the version currently
  committed in the repo.

**Rationale**: One detailed, pharmacy-owned process reference stops specs from drifting from how
the hospital actually works. Keeping defaults as configuration lets each hospital adopt the
system without code changes.

## Reference Flows

The canonical process definition is **Hospital_Pharmacy_System_Flow_v2**, stored at
`docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf`. The Domain Reference manual is built on it and
gives the detailed procedures. The manual's Appendix D decision IDs (D1.1–D5.1) are the stable
branch IDs for these flows. If the manual and the flow PDF disagree, the spec MUST flag the
discrepancy, and it MUST be resolved through the manual's change control before implementation.

The system MUST implement these five flows:

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

- **Scope**: features MUST trace to one or more of these flows. Work outside them needs a
  flow amendment first (see Governance).
- **Fidelity**: every decision node and outcome in the flows MUST exist in the system. This
  includes rejection, resubmission, revision and escalation loops. A branch MUST NOT be dropped
  or merged without an amendment.
- **Principles take precedence**: where a flow is silent, Principles I–X apply. In particular:
  - Every "stock" box in a flow is a posted document (Principle II).
  - Every "approves?" node is a segregated approval (Principle V).
  - Every "quarantine" box is a move to a quarantine location (Principle III).
- **GRN to QC**: goods that pass the GRN check MUST go to a QC quarantine location. They are
  allocatable only after QC passes (Flow 1, Principle III).
- **Emergency local purchase** (Flow 1):
  - It is the only path where approval comes after the purchase.
  - It MUST still post a GRN and pass the GRN and QC checks.
  - Retrospective approval MUST come from a different user than the one who purchased.
  - A rejected retrospective approval MUST escalate to audit and be recorded (Principle VII).
- **Returns from wards and patients** (Flows 2 and 3): a return is accepted into allocatable
  stock only after a recorded check that it is sealed, unexpired and cold-chain compliant.
  Rejected returns go to a quarantine location for disposal (Flow 4).
- **Recall patient tracing** (Flow 5): tracing which patients received a batch is a permitted
  purpose under Principle X. Access is limited to the roles that handle recalls, and every trace
  is audited.

## Technology Constraints

- **Frontend**: React + TypeScript, built with Vite and deployed on Vercel. The frontend MUST
  NOT hold privileged credentials. It MUST NOT persist patient data outside the hosting region
  set below, for example through server-side functions or caches.
- **Backend**: Python FastAPI, deployed on AWS within the Free Tier. Moving to a paid AWS
  service is a technology change (see last bullet).
- **Data, auth and files**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage).
- **Write path**: every business write MUST go through the FastAPI backend. This includes stock
  movements and other stock documents, approvals, NDPS/Schedule X entries, configuration changes
  and audit entries. The browser MUST NOT write directly to Supabase tables or storage for these.
  The Supabase service-role key MUST exist only on the backend.
- **Defence in depth**: Supabase Row Level Security (RLS) MUST be enabled on every table, with
  explicit policies. A table without RLS MUST fail CI or migration review. RLS is an extra layer
  and does not replace backend authorisation (Principles V and X).
- **Data residency**: Supabase projects and the AWS resources that store or process patient data
  MUST be hosted in **ap-south-1 (Mumbai)**.
- **Testing**:
  - backend: pytest,
  - frontend: Vitest + React Testing Library,
  - end-to-end flows: Playwright.
- **Technology changes**: adding or replacing a language, framework, hosting provider, database,
  auth provider or test framework requires a constitution amendment (see Governance).

**Rationale**: Routing every write through one backend keeps Principles II, V, VI and VII
enforceable in one place. RLS limits the damage if a key leaks or a policy is missed. Hosting in
Mumbai keeps patient data in India.

## Development Workflow & Quality Gates

- Every feature spec MUST name the Reference Flow(s), the Domain Reference chapters, and the
  Appendix D decision IDs it implements.
  Plans MUST map each of those branches to its tests (Principle IX), written in the mandated
  tools: pytest, Vitest + React Testing Library, and Playwright. Each end-to-end path through a
  flow MUST have a Playwright test.
- The plan's **Constitution Check** gate MUST evaluate Principles I–X, the Domain Reference,
  the Reference Flows and the Technology Constraints explicitly. Any deviation MUST be recorded in the plan's Complexity Tracking with a
  justification and an approver.
- Code review MUST confirm that:
  - no stock mutation bypasses documents,
  - no business write bypasses the FastAPI backend,
  - every new table has RLS enabled,
  - no thresholds are hard-coded,
  - SoD checks compare user identity,
  - audit entries are written for new actions,
  - patient fields are role-restricted.
- CI MUST block merges when tests fail, when ledger/audit immutability tests fail, when a
  required negative test is missing, or when a table lacks RLS.

## Governance

- This constitution supersedes all other project practices. Specs, plans, tasks and code that
  conflict with it MUST be changed, or the constitution MUST be formally amended first.
- **Amendments** MUST be written as a documented proposal stating the change, rationale, impact
  and migration plan. Both the **Chief Pharmacist** and the **tech lead** MUST approve it before
  it is merged. Adding or replacing technology (see Technology Constraints) is an amendment.
  So is changing the Reference Flows: a new flow version (for example v3) MUST be committed
  alongside the amendment, and the version it replaces MUST be kept in the repository.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle or governance rule is removed or redefined incompatibly.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications and wording changes.
- Every amendment MUST update the version line and the Last Amended date.
- **Compliance review**: every plan and pull request MUST verify compliance with this
  constitution. The Chief Pharmacist and tech lead MUST review compliance at least once per
  quarter and after any regulatory change.

**Version**: 1.3.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-06
