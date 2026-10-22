# Decision register

Project decisions for the Hospital Pharmacy Management System and where each one stands.
The constitution (`.specify/memory/constitution.md`) refers to these decisions by ID.

The constitution itself is a **draft and is not ratified**. Its ratification will be recorded
here when the project owner approves it.

A decision marked **Pending** is not confirmed. No spec, plan or document may describe it as
confirmed until its status here changes.

| Status | Meaning |
| --- | --- |
| Approved | Decided by the project owner and in force |
| Pending verification | A fact that must be checked against the real environment |
| Pending confirmation | A choice that has not been made yet |
| Pending sign-off | Needs formal approval from a named owner |

## Summary

| ID | Decision | Status | Blocks |
| --- | --- | --- | --- |
| D-001 | Browser data access goes only through FastAPI | Approved | — |
| D-002 | Data region of Supabase and EC2 | **Pending verification** | Production go-live |
| D-003 | Frontend hosting | **Pending confirmation** | Production go-live, frontend deploy pipeline |
| D-004 | Compliance owner confirms applicable requirements | **Pending sign-off** | Production go-live |
| D-005 | FEFO tie-break order | Approved | — |
| D-006 | One hospital now, scoped by `hospital_id` | Approved | — |
| D-007 | Stock take is part of Foundation (001) | Approved | — |
| D-008 | Three repositories with matching feature branches | Approved | — |
| D-009 | Spec Kit set up again; constitution v1.3.0 retired | Approved | — |
| D-010 | Flow diagram is the only business-process reference | Approved | — |
| D-011 | Whether FEFO overrides are allowed | **Pending confirmation** | FEFO override feature |
| D-012 | Expiry-date boundary and any "do not dispense" window | **Pending confirmation** | Final rule at the expiry boundary (a temporary rule applies) |
| D-013 | Allocation splits across batches in FEFO order | Approved | — |
| D-014 | Separation-of-duties rules beyond "raiser ≠ approver" | **Pending confirmation** | Those SoD rules |
| D-015 | Backup and recovery targets | **Pending confirmation** | Production go-live |
| D-016 | Supabase configuration committed in the public frontend repo | **Pending confirmation** | Production go-live |
| D-017 | Opening stock enters through an opening-stock document | Approved | — |

## D-001: Browser data access goes only through FastAPI

- **Status**: Approved
- **Decided by**: project owner, in review on 2026-10-21 (Gate A)
- **Decision**:
  - All browser reads and writes of application data go through the FastAPI backend.
  - The browser does not query Supabase tables, views, RPC functions or storage.
  - The browser may use the Supabase JS client for Supabase Auth only: sign-in, session refresh,
    sign-out and MFA. It sends the access token to FastAPI as a bearer token. FastAPI verifies the
    token and enforces role × location access.
- **Exceptions**: any future exception needs a constitution amendment with a written
  justification and a security and architecture review.
- **Impact on existing code**: `frontend/src/App.tsx` currently reads the `items` table directly
  through Supabase. This breaks D-001. Feature 001 must remove it. The code is not changed yet.

## D-002: Data region of Supabase and EC2

- **Status**: Pending verification
- **Owner**: to be assigned
- **Proposed target**: ap-south-1 (Mumbai), to keep patient data in India. This is a proposal,
  not a confirmed fact.
- **Evidence found so far (2026-10-21)**: none that shows the region.
  - `backend/.env` `SUPABASE_URL` contains only the project ID. Supabase URLs do not encode the
    region.
  - The EC2 host is stored as the GitHub secret `EC2_HOST`. The deploy workflow does not name a
    region.
  - There is no AWS CLI configuration on the development machine.
- **Rule until closed**: the region is deployment configuration. Code must not hard-code it.
- **How to close**:
  1. Supabase dashboard → Project Settings → General: record the region.
  2. AWS console → EC2 → the instance: record the region and Availability Zone.
  3. If either is not the approved region, record the migration plan here.
  4. Update this entry with the date, the regions, and who checked them.

## D-003: Frontend hosting

- **Status**: Pending confirmation
- **Owner**: to be assigned
- **Candidate**: Vercel. Not decided.
- **Evidence found so far (2026-10-21)**: the Vercel CLI is installed on the development
  machine, but `frontend/` is not linked to a Vercel project (no `.vercel/` folder, no
  `vercel.json`) and there is no frontend deploy workflow. This does not show where the frontend
  is or will be hosted.
- **Scope**: this decision is separate from the backend's Docker / GHCR / EC2 deployment.
- **Constraints on any host**: no privileged credentials in the frontend, and no patient data
  persisted outside the approved data region (D-002).
- **How to close**: choose the host and record it, its region, and the deployment method.

## D-004: Compliance owner confirms applicable requirements

- **Status**: Pending sign-off
- **Owner**: the hospital's designated compliance owner (person not yet named)
- **Context**: the constitution contains engineering controls that support compliance:
  auditability, batch traceability, NDPS / Schedule X controls, segregation of duties, and DPDP
  privacy. These are not verified legal or regulatory compliance.
- **To confirm**:
  - Which laws and rules apply: Drugs and Cosmetics Act 1940 and Rules, NDPS Act 1985, DPDP Act
    2023, GST.
  - NDPS / Schedule X: which movements beyond dispensing need a register entry or dual sign-off,
    the register's content and format, and reconciliation rules.
  - Retention periods for registers, the audit trail and patient data, and erasure rules.
- **How to close**: the compliance owner reviews the constitution and the specs and records
  sign-off here, with the date and any changes required.
- **Blocks**: production go-live.

## D-005: FEFO tie-break order

- **Status**: Approved
- **Decided by**: project owner, in review on 2026-10-21 (Gate A)
- **Decision**: allocation orders allocatable batches by:
  1. earliest expiry date first;
  2. if expiry dates match, earliest GRN posting date first;
  3. if both match, lowest batch record ID first.
- **Acceptance scenarios** (feature 001 must turn each into an automated test):
  1. Two batches with different expiry dates: the earlier expiry is proposed first.
  2. Two batches with the same expiry date and different GRN dates: the earlier GRN is
     proposed first.
  3. Two batches with the same expiry date and the same GRN date: the lower batch ID is
     proposed first.
  4. The same allocation request run twice on the same stock returns the same batch order.
- **Moved out**: the earlier scenario about overrides depends on D-011, which is pending.
- **Recorded in**: constitution Principle IV.

## D-006: One hospital now, scoped by `hospital_id`

- **Status**: Approved
- **Decided by**: project owner, 2026-10-21
- **Decision**: the system serves one hospital. Every business table carries `hospital_id`,
  every query and RLS policy filters by it, and configuration is scoped by it, so more hospitals
  can be added later without redesign.
- **Recorded in**: constitution, Regulatory & Domain Constraints and Technology Constraints →
  Tenant isolation.

## D-007: Stock take is part of Foundation (001)

- **Status**: Approved
- **Decided by**: project owner, 2026-10-21
- **Decision**: stock counts and approved variance adjustments are delivered in feature 001 at
  priority P3.
- **Note**: stock take is not shown in the flow diagram. It is in scope because of this
  decision, not because of the diagram.

## D-008: Three repositories with matching feature branches

- **Status**: Approved
- **Decided by**: project owner, 2026-10-21
- **Decision**:
  - Root specs repo: `.specify/`, `.claude/`, `specs/`, `docs/`.
  - PMS-backend (`backend/`) and PMS-frontend (`frontend/`) stay separate repositories.
  - Each feature uses the same branch name `NNN-short-name` in every repository it affects.
- **Note**: the installed Spec Kit does not create git branches (its git extension is not
  installed). Branches are created by hand.
- **Recorded in**: constitution, Technology Constraints.

## D-009: Spec Kit set up again; constitution v1.3.0 retired

- **Status**: Approved
- **Decided by**: project owner, 2026-10-21
- **Decision**: Spec Kit 1.1.1.dev0 was initialised from scratch. The new constitution draft
  starts at v1.0.0, using the retired v1.3.0 as its starting draft. v1.3.0 and the old spec 001
  remain available in git history (commit `9d28665`); they are not sources for requirements.

## D-010: Flow diagram is the only business-process reference

- **Status**: Approved
- **Decided by**: project owner, 2026-10-22
- **Decision**:
  - `docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf` is the primary business-process
    reference. It stays at this path.
  - The earlier process manual is retired and is not a source for business rules.
  - No separate roadmap or workflow document is maintained. Spec Kit feature artifacts are the
    operational development artifacts, and features are developed one at a time.
  - Business rules the diagram does not show are recorded as gaps or clarification questions,
    never invented. Conflicts with approved engineering constraints block the affected
    requirement until resolved.
- **Recorded in**: constitution, Business-Process Reference.

## D-011: Whether FEFO overrides are allowed

- **Status**: Pending confirmation
- **Owner**: to be assigned
- **Context**: the diagram says "earliest expiry first" and does not show any override. Until
  this is decided, the system offers no override.
- **To decide**: whether a user may pick a different batch; if so, who, and which reasons are
  allowed.

## D-012: Expiry-date boundary and any "do not dispense" window

- **Status**: Pending confirmation
- **Owner**: to be assigned
- **Context**: the diagram quarantines expired stock (`F4:"Expired: quarantine"`) and lists alert
  windows of 90, 60 and 30 days, but does not say whether a batch is usable on its expiry date or
  whether stock close to expiry may still be dispensed.
- **To decide**: is a batch allocatable on its expiry date; how month-only expiry dates are
  interpreted; whether there is a window before expiry in which stock must not be issued.
- **Temporary rule** (chosen by the project owner on 2026-10-22 while this stays pending): a
  batch is not allocatable on or after its expiry date. It is a configuration value, so the
  final decision needs no code change.

## D-013: Allocation splits across batches in FEFO order

- **Status**: Approved
- **Decided by**: project owner, 2026-10-22 (Feature 001 specification, Q3)
- **Context**: the diagram shows "Approved (full or partial)" for indents and the shortfall paths
  `F2:"Enough stock in pharmacy?"` and `F3:"In stock?"`, but not how a quantity is spread across
  batches.
- **Decision**: when the first FEFO batch cannot cover the requested quantity, allocation takes
  the remainder from the next batches in FEFO order. Any quantity still uncovered is reported to
  the calling feature as a shortfall. What the flow does with a shortfall follows the diagram.

## D-014: Separation-of-duties rules beyond "raiser ≠ approver"

- **Status**: Pending confirmation
- **Owner**: to be assigned
- **Context**: the constitution enforces "the user who raises a request must not approve it" and
  two different users for NDPS dual sign-off. The earlier draft also proposed that the users who
  create a PO, post its receipt and release its payment be three different users. That rule is
  not shown in the diagram.
- **To decide**: which additional separation rules apply.

## D-015: Backup and recovery targets

- **Status**: Pending confirmation
- **Owner**: to be assigned
- **Context**: the constitution requires backups and a tested restore before go-live but sets no
  recovery point or recovery time targets.
- **To decide**: the targets, and where restores are tested.

## D-016: Supabase configuration committed in the public frontend repo

- **Status**: Pending confirmation (security finding, 2026-10-22)
- **Owner**: to be assigned
- **Findings** (checked without displaying any secret value):
  - `frontend/.env` is tracked by git. It was committed in `6be71dc` ("Initial commit") and is on
    `origin/main` and `origin/speckit-configuration`.
  - The committed file contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The key's role
    claim is `anon`, not `service_role`.
  - The PMS-frontend GitHub repository is publicly readable (the unauthenticated GitHub API
    returns HTTP 200).
  - The same anon key and project URL are in `backend/.env`, which is not tracked by git.
  - The working copy of `frontend/.env` has these two lines removed, but the change is not
    committed, and the values remain in history.
- **Risk**: the anon key is designed to be public, but with it anyone can call the Supabase API
  for this project. Any table without RLS, or with permissive policies, can be read or changed.
  The RLS state of the existing `items` table is not known.
- **Also noted**: the backend uses the anon key, not a service-role key. How the backend should
  access the database is decided in the Feature 001 plan (constitution, Tenant isolation).
- **Options to decide**: confirm RLS is enabled on every table now; stop tracking `.env` and add a
  `.env.example`; rotate the project's API keys; decide whether to rewrite git history.
- **No changes have been made.** `.env` files are not to be changed without approval.

## D-017: Opening stock enters through an opening-stock document

- **Status**: Approved
- **Decided by**: project owner, 2026-10-22 (Feature 001 specification, Q1)
- **Context**: the diagram's only route for stock to enter is Flow 1 (`F1:"Stock in central
  store"`). Stock the hospital already holds at go-live needs a way in.
- **Decision**: an authorised user posts a one-time opening-stock document per location (item,
  batch, expiry, quantity). It is approved by a different user and audited like any other
  posting.
