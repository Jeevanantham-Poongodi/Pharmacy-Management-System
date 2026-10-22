---

description: "Task list for Feature 001 — Foundation"
---

# Tasks: Foundation

**Input**: Design documents from `/specs/001-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml,
quickstart.md

**Tests**: Required. Constitution Principle IX (test-first, non-negotiable): every test task is
written and seen to fail before the implementation task it covers.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on
its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: Which user story the task belongs to (US1–US8 in spec.md)

## Path Conventions

Two repositories (D-008): `backend/` = PMS-backend, `frontend/` = PMS-frontend. Paths below are
relative to the specs repo root, where both are checked out. Work happens on branch
`001-foundation` in each repo, created by hand when implementation is approved.

**Approval gates inside this list**: tasks marked **(needs approval: D-016)** change a tracked
`.env` file and must not start until the project owner approves D-016.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and project skeleton. No behaviour yet.

- [ ] T001 Create branch `001-foundation` in `backend/` and `frontend/` from their current default branch after implementation approval (D-008); record the base commit in the PR description
- [ ] T002 Create backend package skeleton `backend/app/{__init__.py,main.py}`, `backend/app/{core,api/v1,domain,repositories,jobs}/__init__.py`, and `backend/tests/{unit,contract,integration}/__init__.py` per plan.md
- [ ] T003 [P] Add `backend/pyproject.toml` with ruff (lint + format) and pytest configuration, and `backend/requirements-dev.txt` (pytest, ruff, openapi-core, httpx)
- [ ] T004 [P] Update `backend/requirements.txt` runtime dependencies: fastapi, uvicorn, psycopg[binary], psycopg_pool, pydantic, pydantic-settings, PyJWT[crypto], supabase (Auth admin calls only)
- [ ] T005 [P] Initialise the Supabase CLI project in `backend/supabase/` (`config.toml`, empty `migrations/`, `seed.sql`) per research R5
- [ ] T006 [P] Add `backend/.env.example` listing names only: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_MODE`, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS` (research R12)
- [ ] T007 [P] Add frontend test tooling: Vitest, React Testing Library, jsdom and Playwright in `frontend/package.json`; `frontend/vitest.config.ts`; `frontend/playwright.config.ts`; scripts `test` and `e2e`
- [ ] T008 [P] Add `frontend/.env.example` with names only: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] T009 [P] Add React Router to `frontend/package.json` and confirm `frontend/tsconfig.app.json` has `"strict": true`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database roles, tenancy, audit, settings, idempotency, approvals guard and the
request pipeline that every story uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Phase 2 (write first, must fail)

- [ ] T010 [P] Integration test: a table without RLS fails the RLS check query in `backend/tests/integration/test_rls_enabled.py`
- [ ] T011 [P] Integration test: inside a user transaction `auth.uid()` returns the token's `sub`, and a member of hospital H1 cannot select hospital H2 rows in `backend/tests/integration/test_user_transaction_rls.py`
- [ ] T012 [P] Unit tests for token verification: valid token accepted; expired, wrong issuer, wrong audience and bad signature rejected with `UNAUTHENTICATED`; both `jwks` and `secret` modes, in `backend/tests/unit/test_auth_tokens.py`
- [ ] T013 [P] Unit test: a user holding a privileged role with `aal` ≠ `aal2` gets `403 MFA_REQUIRED`; a non-privileged user with `aal1` is allowed (FR-008) in `backend/tests/unit/test_mfa_rule.py`
- [ ] T014 [P] Unit test: every error response matches `{"error": {"code","message","details","request_id"}}` and never includes stack traces in `backend/tests/unit/test_error_envelope.py`
- [ ] T015 [P] Integration tests for idempotency (research R8): missing key → 400 `IDEMPOTENCY_KEY_REQUIRED`; same key + same body → stored response, no second effect; same key + different body → 422 `IDEMPOTENCY_KEY_REUSED`; concurrent same key → one executes, other 409 `REQUEST_IN_PROGRESS` after lock timeout; rolled-back attempt leaves no key row, in `backend/tests/integration/test_idempotency.py`
- [ ] T016 [P] Integration tests for the audit trail store: insert-only; UPDATE and DELETE on `audit_entries` fail for `authenticated` and `pms_system`; `entry_hash` chain verifies and a tampered row breaks verification, in `backend/tests/integration/test_audit_store.py`
- [ ] T017 [P] Integration tests for settings: value read at runtime; `setting_history` returns the value in force on a past date; a missing required setting raises `SETTING_MISSING`, in `backend/tests/integration/test_settings_store.py`
- [ ] T018 [P] Unit + integration tests for the approval guard: decider = raiser → `SELF_APPROVAL_FORBIDDEN` even when the raiser holds the approver role (compares user IDs, FR-041); DB trigger on `approvals` rejects the same case, in `backend/tests/integration/test_approval_guard.py`
- [ ] T019 [P] Contract test harness that loads `specs/001-foundation/contracts/openapi.yaml` (copied to `backend/tests/contract/openapi.yaml`) and validates request/response pairs with openapi-core, in `backend/tests/contract/conftest.py`
- [ ] T020 [P] Contract + unit test for `GET /api/v1/health` (no auth, `{"status":"ok"}`) in `backend/tests/contract/test_health.py`

### Implementation for Phase 2

- [ ] T021 Migration `backend/supabase/migrations/<ts>_roles_and_rls_helpers.sql`: create roles `pms_api` (login, no table privileges, may `SET ROLE authenticated` and `pms_system`) and `pms_system`; function `app.current_hospital_ids()` returning hospitals where `hospital_members.user_id = auth.uid() and active`
- [ ] T022 Migration `backend/supabase/migrations/<ts>_tenancy_access.sql`: tables `hospitals` (`time_zone` "required, seed `Asia/Kolkata`"), `hospital_members` (PK (hospital_id, user_id); "deactivation blocks all access"), `roles` (`code` "unique per hospital"; `privileged` boolean), `permissions`, `role_permissions`, `user_roles`, `user_locations`; RLS enabled with policies `hospital_id = any(app.current_hospital_ids())`
- [ ] T023 Migration `backend/supabase/migrations/<ts>_audit.sql`: `audit_entries` per data-model.md ("append-only, hash-chained"; `prev_hash`, `entry_hash`); no UPDATE/DELETE grants; `BEFORE UPDATE OR DELETE` trigger raising an error; SELECT policy requires `audit.read` permission
- [ ] T024 Migration `backend/supabase/migrations/<ts>_settings.sql`: `settings` (PK (hospital_id, key)) and append-only `setting_history` ("value on date D = latest row with `valid_from <= D`")
- [ ] T025 Migration `backend/supabase/migrations/<ts>_approvals_idempotency.sql`: `approvals` (append-only; `decision` in (`approved`,`rejected`); `reason` "required for `rejected`"), `approval_rules`, `idempotency_keys` (PK (hospital_id, user_id, operation, key)); trigger rejecting an approval whose `decided_by` equals the subject's `raised_by`
- [ ] T026 Seed `backend/supabase/seed.sql`: development hospital; roles `store, drug_committee, hod, finance, ward, pharmacist, prescriber, nurse, qc, audit, admin` (FR-004); permission list; only `admin` gets permissions (OI-6); settings `expiry.alert_windows_days = [90,60,30]`, `allocation.block_on_expiry_date = true`, `auth.privileged_role_codes = ["admin","audit","finance"]`; leave `idempotency.key_retention_days`, `idempotency.lock_timeout_ms`, `ledger.drift_check_schedule` **unset for production** and set them only in a clearly marked dev block
- [ ] T027 [P] Settings loader `backend/app/core/config.py` (pydantic-settings, env names from T006); app fails fast on missing env vars
- [ ] T028 [P] Structured JSON logging with `request_id` middleware; logs never include tokens, secrets or patient identifiers, in `backend/app/core/logging.py`
- [ ] T029 [P] Error types and envelope handler with stable codes from the contract in `backend/app/core/errors.py`
- [ ] T030 Database pool and `user_transaction(claims)` context manager that runs `SET LOCAL ROLE authenticated` and `set_config('request.jwt.claims', …, true)`; `system_transaction(job, hospital_id)` for `pms_system`, in `backend/app/core/db.py` (research R1, R2)
- [ ] T031 Token verification (JWKS or secret mode, issuer, audience `authenticated`, expiry) and current-user dependency that loads active membership, roles, locations and permissions; MFA rule from `auth.privileged_role_codes`, in `backend/app/core/auth.py`
- [ ] T032 Permission check helper `require(permission, location_id=None)` used by every route; hospital scope always from membership, never from the request, in `backend/app/core/access.py`
- [ ] T033 Idempotency helper implementing research R8 (key table insert in the same transaction, lock timeout from settings, request hash, stored response) in `backend/app/core/idempotency.py`
- [ ] T034 Audit writer `audit.record(...)` that computes the per-hospital hash chain under an advisory lock and strips secret/token fields, in `backend/app/domain/audit.py` and `backend/app/repositories/audit.py`
- [ ] T035 Settings service (current value, value as of date, `SETTING_MISSING`) in `backend/app/domain/settings.py` and `backend/app/repositories/settings.py`
- [ ] T036 Approval guard and approval recorder (raiser ≠ decider by user ID; reason required on reject; audited) in `backend/app/domain/approvals.py` and `backend/app/repositories/approvals.py`
- [ ] T037 App factory with CORS from `CORS_ORIGINS`, routers under `/api/v1`, error handlers and middleware in `backend/app/main.py`; reduce `backend/main.py` to `from app.main import app`
- [ ] T038 Health route `GET /api/v1/health` (checks the pool) in `backend/app/api/v1/health.py`; remove `/`, `/hello` and `/test-db` from the old `backend/main.py` (research R11)
- [ ] T039 [P] Point the Docker health checks at `/api/v1/health` in `backend/docker-compose.yml` and `backend/docker-compose.prod.yml`
- [ ] T040 Integration test fixtures: start from `supabase db reset`, create two hospitals and test users via the Auth admin API, mint tokens, in `backend/tests/integration/conftest.py`

**Checkpoint**: T010–T020 pass. Every later story builds on this.

---

## Phase 3: User Story 1 — Staff sign in and see only what their role, location and hospital allow (Priority: P1) 🎯 MVP

**Goal**: Administrator-managed accounts, roles, locations, MFA for privileged roles, tenant
isolation, and a frontend that uses Supabase for sign-in only (D-001).

**Independent Test**: quickstart steps 1–3 and 18.

### Tests for User Story 1 (write first, must fail)

- [ ] T041 [P] [US1] Contract tests for `GET /me`, `GET/POST /users`, `PATCH /users/{userId}`, `GET /roles`, `PATCH /roles/{roleCode}` in `backend/tests/contract/test_access_contract.py`
- [ ] T042 [P] [US1] Integration tests: only admins create users (FR-002); no self-registration path; deactivated user refused on next request (US1 scenario 4); role/location removal takes effect on the next request (edge case) in `backend/tests/integration/test_user_admin.py`
- [ ] T043 [P] [US1] Integration tests: request naming another hospital's or an unassigned location's ID → 403 and an `access_denied` audit entry (FR-006, SC-001) in `backend/tests/integration/test_tenant_isolation.py`
- [ ] T044 [P] [US1] Frontend unit tests: API client attaches bearer token, sends `Idempotency-Key` on posting calls, parses the error envelope in `frontend/tests/api/client.test.ts`
- [ ] T045 [P] [US1] Frontend test: no module except `src/supabaseClient.ts` imports `@supabase/supabase-js`, and `supabaseClient.ts` exposes only `auth` (static check) in `frontend/tests/readPath.test.ts`
- [ ] T046 [P] [US1] Playwright test: sign in (with MFA for admin), see `/me` data, and assert no network request goes to Supabase REST/storage endpoints (FR-007) in `frontend/e2e/signin.spec.ts`

### Implementation for User Story 1

- [ ] T047 [US1] Users repository (members, roles, locations) in `backend/app/repositories/access.py`
- [ ] T048 [US1] Access domain service: create user via Supabase Auth admin API as system job `user_provisioning` (audited), deactivate, set roles and locations, set role permissions and `privileged` flag (all audited) in `backend/app/domain/access.py`
- [ ] T049 [US1] Routes `GET /me`, `GET/POST /users`, `PATCH /users/{userId}`, `GET /roles`, `PATCH /roles/{roleCode}` in `backend/app/api/v1/access.py`
- [ ] T050 [US1] Restrict `frontend/src/supabaseClient.ts` to auth use only; remove the `items` query and the `/test-db` call from `frontend/src/App.tsx` (D-001)
- [ ] T051 [P] [US1] API client in `frontend/src/api/client.ts` (base URL from `VITE_API_BASE_URL`, bearer token from the Supabase session, `Idempotency-Key` generation, error envelope)
- [ ] T052 [P] [US1] Auth context, sign-in page and MFA step in `frontend/src/auth/`
- [ ] T053 [US1] Router and protected layout showing the user's hospital, roles and locations in `frontend/src/App.tsx`
- [ ] T054 [US1] User administration page (create, deactivate, roles, locations) and role permission page in `frontend/src/pages/admin/`

**Checkpoint**: US1 works on its own; MVP for access control.

---

## Phase 4: User Story 2 — Master data is maintained with full history (Priority: P1)

**Goal**: Items, batches, locations, vendors; audited changes; no deletion with stock history.

**Independent Test**: quickstart steps 4–5.

### Tests for User Story 2 (write first, must fail)

- [ ] T055 [P] [US2] Contract tests for `/items`, `/items/{itemId}`, `/batches`, `/locations`, `/locations/{locationId}`, `/vendors`, `/vendors/{vendorId}` in `backend/tests/contract/test_master_data_contract.py`
- [ ] T056 [P] [US2] Integration tests: item requires `base_unit`; `formulary_status` only `formulary`/`non_formulary`; `controlled_class` only `none`/`narcotic`/`schedule_x`; duplicate batch number for the same item → 409 (FR-011); quarantine and QC locations have `allocatable = false`; every change audited with before/after (FR-014) in `backend/tests/integration/test_master_data.py`
- [ ] T057 [P] [US2] Integration test: deleting an item, batch, location or vendor with ledger lines fails at the database and the API has no DELETE route (FR-015) in `backend/tests/integration/test_no_delete.py`

### Implementation for User Story 2

- [ ] T058 [US2] Migration `backend/supabase/migrations/<ts>_master_data.sql`: `items` (unique (hospital_id, lower(name)); `base_unit` required), `batches` (unique (hospital_id, item_id, batch_number); `expiry_date` required; `first_receipt_posted_at` nullable), `locations` (`type` in `central_store, pharmacy, ward, ot, icu, qc, quarantine`; `allocatable` generated false for `qc`/`quarantine`), `vendors`, `item_location_settings` (`reorder_level` ≥ 0); RLS; no DELETE grants; delete-guard triggers
- [ ] T059 [P] [US2] Repositories in `backend/app/repositories/master_data.py`
- [ ] T060 [US2] Domain service with validation and audit in `backend/app/domain/master_data.py`
- [ ] T061 [US2] Routes in `backend/app/api/v1/master_data.py`
- [ ] T062 [P] [US2] Frontend pages for items, batches, locations, vendors (list, create, edit, deactivate) in `frontend/src/pages/master-data/`
- [ ] T063 [P] [US2] Frontend component tests for the item form validation in `frontend/tests/pages/itemForm.test.tsx`

**Checkpoint**: US1 and US2 work independently.

---

## Phase 5: User Story 3 — Every stock change is a posted document on an append-only ledger (Priority: P1)

**Goal**: Posting service, opening stock (D-017), reversal with approval, balances, drift check.

**Independent Test**: quickstart steps 6–9 and 13.

### Tests for User Story 3 (write first, must fail)

- [ ] T064 [P] [US3] Contract tests for `/stock/balances`, `/stock-documents`, `/stock-documents/{documentId}`, `/stock-documents/{documentId}/decision`, `/stock-documents/{documentId}/resubmit` in `backend/tests/contract/test_stock_documents_contract.py`
- [ ] T065 [P] [US3] Integration tests for posting: ledger lines record item, batch, location, quantity, document, user, server time, type and reason (FR-021); document + lines + audit commit together, and a failing line rolls back everything (FR-024); posting that would make a balance negative fails with `INSUFFICIENT_STOCK` and posts nothing (FR-025) in `backend/tests/integration/test_posting.py`
- [ ] T066 [P] [US3] Integration test: direct UPDATE/DELETE on `ledger_lines` and on a `posted` `stock_documents` row fails (FR-022, SC-006) in `backend/tests/integration/test_ledger_immutability.py`
- [ ] T067 [P] [US3] Integration tests for opening stock (D-017): raiser cannot approve; different approver posts it; batch `first_receipt_posted_at` is set on first posting in `backend/tests/integration/test_opening_stock.py`
- [ ] T068 [P] [US3] Integration tests for reversal (FR-023): needs approval by a different user; restores balances; second reversal of the same document → `ALREADY_REVERSED`; reversing a reversal refused; reversal that would drive a balance negative fails in `backend/tests/integration/test_reversal.py`
- [ ] T069 [P] [US3] Concurrency test: 100 replays of the same approval request (including parallel ones) change stock exactly once (SC-002) in `backend/tests/integration/test_posting_replay.py`
- [ ] T070 [P] [US3] Integration test: drift check job finds no difference on clean data and alerts on a deliberately altered `stock_balances` row (FR-027, SC-005) in `backend/tests/integration/test_drift_check.py`

### Implementation for User Story 3

- [ ] T071 [US3] Migration `backend/supabase/migrations/<ts>_stock.sql`: `stock_documents` (`type` and `status` enums per data-model.md; `reverses_document_id` unique; `idempotency_key` unique per (hospital_id, raised_by, idempotency_key); trigger refusing changes when `status = 'posted'`), `stock_document_lines` (`quantity` > 0), `ledger_lines` (append-only; `quantity_delta` non-zero; no UPDATE/DELETE + trigger), `stock_balances` (`CHECK (quantity >= 0)`); RLS on all
- [ ] T072 [US3] Stock repositories with ordered `SELECT … FOR UPDATE` on balance rows `(batch_id, location_id)` in `backend/app/repositories/stock.py`
- [ ] T073 [US3] Posting service: validate lines, lock balances in order, apply deltas, insert ledger lines, set `first_receipt_posted_at`, write audit, all in one transaction; the only way any feature changes stock (Principle XI) in `backend/app/domain/posting.py`
- [ ] T074 [US3] Stock document service: raise opening stock and reversal (status `submitted`), decide (approve → post; reject with reason), resubmit after rejection keeping history (FR-042), using the approval guard and idempotency helper, in `backend/app/domain/stock_documents.py`
- [ ] T075 [US3] Routes for balances and stock documents in `backend/app/api/v1/stock.py` and `backend/app/api/v1/stock_documents.py`
- [ ] T076 [US3] Ledger drift check job as system job `ledger_drift_check` (role `pms_system`, explicit hospital scope, audited, schedule from setting `ledger.drift_check_schedule`, alert via log at error level) in `backend/app/jobs/ledger_drift_check.py`
- [ ] T077 [P] [US3] Frontend: stock balances page, opening-stock form, reversal request, and an approvals inbox for submitted documents in `frontend/src/pages/stock/`
- [ ] T078 [P] [US3] Playwright test: opening stock raised by one user and approved by another; balance shown matches in `frontend/e2e/openingStock.spec.ts`

**Checkpoint**: US1–US3 work; the ledger is usable by later features.

---

## Phase 6: User Story 4 — Allocation proposes batches in FEFO order and never over-issues (Priority: P1)

**Goal**: Read-only FEFO proposals (D-005, D-013, D-012 temporary rule) and proof that
concurrent postings cannot over-issue.

**Independent Test**: quickstart steps 10–12; concurrency check in quickstart section 6.

### Tests for User Story 4 (write first, must fail)

- [ ] T079 [P] [US4] Contract test for `POST /stock/allocation-proposals` in `backend/tests/contract/test_allocation_contract.py`
- [ ] T080 [P] [US4] Integration tests for FEFO order (D-005): different expiry → earlier first; same expiry, different first-receipt time → earlier first; same expiry and receipt → lower batch ID first; same request twice → same order (SC-004) in `backend/tests/integration/test_fefo_order.py`
- [ ] T081 [P] [US4] Integration tests: split across batches (4 from A + 2 from B for 6 requested; D-013); 8 requested with 5 available → 5 proposed + shortfall 3; QC/quarantine stock never proposed; expired batch never proposed; batch expiring today not proposed while `allocation.block_on_expiry_date = true` and proposed when it is false (FR-031) in `backend/tests/integration/test_allocation_rules.py`
- [ ] T082 [P] [US4] Concurrency test: two parallel postings for the last 10 units, each for 10 → at most 10 issued, the other fails with `INSUFFICIENT_STOCK` (SC-003) in `backend/tests/integration/test_concurrent_issue.py`
- [ ] T083 [P] [US4] Test: the proposal response contains no batch-choice option and the API accepts no override field (FR-035, D-011) in `backend/tests/contract/test_no_fefo_override.py`

### Implementation for User Story 4

- [ ] T084 [US4] Allocation query (allocatable locations, active unexpired batches, D-005 order, expiry boundary from setting) in `backend/app/repositories/allocation.py`
- [ ] T085 [US4] Allocation service returning proposal lines and shortfall; no reservation; used by later features before calling the posting service in `backend/app/domain/allocation.py`
- [ ] T086 [US4] Route `POST /stock/allocation-proposals` in `backend/app/api/v1/stock.py`
- [ ] T087 [P] [US4] Frontend: proposal viewer on the balances page (read-only, no batch choice) in `frontend/src/pages/stock/AllocationPreview.tsx`

**Checkpoint**: all P1 stories complete.

---

## Phase 7: User Story 5 — Approvals are recorded and the raiser cannot approve (Priority: P2)

**Goal**: Configurable approver role per document type, rejection and resubmission history.

**Independent Test**: spec US5 scenarios 1–3.

### Tests for User Story 5 (write first, must fail)

- [ ] T088 [P] [US5] Contract tests for `/approval-rules` in `backend/tests/contract/test_approval_rules_contract.py`; integration tests: approver must hold the role set in `approval_rules` for that document type (FR-043); a user holding both raiser and approver roles cannot approve own document (FR-041); rejected → resubmitted keeps earlier decisions in `decisions` (FR-042) in `backend/tests/integration/test_approvals_flow.py`

### Implementation for User Story 5

- [ ] T089 [US5] Approval rule configuration (`GET /approval-rules`, `PUT /approval-rules/{subjectType}/{docType}`; audited) in `backend/app/domain/approvals.py` and `backend/app/api/v1/approval_rules.py`
- [ ] T090 [P] [US5] Frontend: decision history on document detail and approval-rule settings page in `frontend/src/pages/stock/` and `frontend/src/pages/admin/`

---

## Phase 8: User Story 6 — Auditors can review a complete, tamper-resistant audit trail (Priority: P2)

**Goal**: Search, export (audited), hash-chain verification.

**Independent Test**: quickstart steps 15–16.

### Tests for User Story 6 (write first, must fail)

- [ ] T091 [P] [US6] Contract tests for `GET /audit-entries` and `POST /audit-exports` in `backend/tests/contract/test_audit_contract.py`
- [ ] T092 [P] [US6] Integration tests: every audited action in the acceptance run has exactly one entry (SC-006); non-auditor gets 403 (FR-052); an export creates an `export` audit entry with its filters; entries contain no tokens or secrets (FR-053) in `backend/tests/integration/test_audit_access.py`

### Implementation for User Story 6

- [ ] T093 [US6] Audit search and CSV export (export audited) in `backend/app/domain/audit.py` and `backend/app/api/v1/audit.py`
- [ ] T094 [US6] Hash-chain verification utility runnable as a system job and from tests in `backend/app/jobs/audit_chain_verify.py`
- [ ] T095 [P] [US6] Frontend audit search and export page in `frontend/src/pages/audit/`

---

## Phase 9: User Story 7 — Thresholds are configuration with history (Priority: P2)

**Goal**: Settings and reorder levels with dated history.

**Independent Test**: quickstart step 17.

### Tests for User Story 7 (write first, must fail)

- [ ] T096 [P] [US7] Contract tests for `/settings`, `/settings/{key}` (with `as_of`) and `/items/{itemId}/reorder-levels/{locationId}` in `backend/tests/contract/test_settings_contract.py`
- [ ] T097 [P] [US7] Integration tests: change of `expiry.alert_windows_days` is audited and visible immediately; `as_of` yesterday returns the old value (FR-061); `reorder_level` < 0 rejected; reason required in `backend/tests/integration/test_settings_api.py`

### Implementation for User Story 7

- [ ] T098 [US7] Routes for settings and reorder levels in `backend/app/api/v1/settings.py`
- [ ] T099 [P] [US7] Frontend settings page and reorder-level editor in `frontend/src/pages/settings/`

---

## Phase 10: User Story 8 — Stock counts are reconciled through approved adjustments (Priority: P3)

**Goal**: Count against a snapshot; one adjustment posts after approval by another user (D-007).

**Independent Test**: quickstart step 14.

### Tests for User Story 8 (write first, must fail)

- [ ] T100 [P] [US8] Contract tests for `/stock-counts`, `/stock-counts/{countId}`, `/lines`, `/submit`, `/decision` in `backend/tests/contract/test_stock_counts_contract.py`
- [ ] T101 [P] [US8] Integration tests: start freezes per-batch snapshot (FR-070); `counted_quantity` ≥ 0; variance = counted − snapshot shown before submission (FR-071); counter cannot approve; approval posts exactly one adjustment document for all variances (FR-072); rejection returns the count to `open` in `backend/tests/integration/test_stock_counts.py`

### Implementation for User Story 8

- [ ] T102 [US8] Migration `backend/supabase/migrations/<ts>_stock_counts.sql`: `stock_counts` (`status` `open`/`submitted`/`approved`/`rejected`; `adjustment_document_id`), `stock_count_lines` (PK (count_id, item_id, batch_id); `counted_quantity` ≥ 0; `variance` generated); RLS
- [ ] T103 [US8] Stock count service using the posting service for the adjustment in `backend/app/domain/stock_count.py` and `backend/app/repositories/stock_count.py`
- [ ] T104 [US8] Routes in `backend/app/api/v1/stock_counts.py`
- [ ] T105 [P] [US8] Frontend count entry and approval pages in `frontend/src/pages/stock-counts/`

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T106 [P] CI workflow for the backend (ruff, pytest with local Supabase, RLS check) that blocks merges, in `backend/.github/workflows/ci.yml`; leave `deploy.yml` unchanged except as T039 requires
- [ ] T107 [P] CI workflow for the frontend (oxlint, `tsc -b`, Vitest, Playwright against a test backend) in `frontend/.github/workflows/ci.yml`
- [ ] T108 [P] Update `backend/README.md` and `frontend/README.md` for the new structure, env names, migrations and test commands
- [ ] T109 Write the branch-to-test and FR-to-test map (FR-001…FR-072, SC-001…SC-008) in `specs/001-foundation/test-map.md` and confirm no FR is unmapped (Principle IX)
- [ ] T110 Run every step of `specs/001-foundation/quickstart.md` and record the actual results in the PR
- [ ] T111 **(needs approval: D-016)** Stop tracking `frontend/.env` (`git rm --cached`), add `.env` to `frontend/.gitignore`, and follow the D-016 decision on key rotation and RLS review
- [ ] T112 Security review: no service-role key outside `backend/app/core/config.py` and the two named jobs; no Supabase data calls in the frontend; logs contain no tokens or patient identifiers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts after implementation approval.
- **Foundational (Phase 2)**: depends on Setup; blocks every story.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on Phase 2; independent of US1 except that tests use US1-created
  users through the shared fixtures (T040).
- **US3 (Phase 5)**: depends on US2 (items, batches, locations).
- **US4 (Phase 6)**: depends on US3 (balances and posting).
- **US5 (Phase 7)**: depends on US3 (documents to approve).
- **US6 (Phase 8)**: depends on Phase 2 only; best run after US3 so the acceptance run has
  entries of every kind.
- **US7 (Phase 9)**: depends on Phase 2; reorder levels need US2.
- **US8 (Phase 10)**: depends on US3.
- **Polish (Phase 11)**: after the stories it touches; T111 needs D-016 approval.

### Within each story

Tests first and failing → migration → repository → domain service → route → frontend.

### Coordination points (shared files)

- Migrations (`backend/supabase/migrations/`) are added in task order; one person owns migration
  numbering at a time.
- `backend/app/main.py` router registration and `contracts/openapi.yaml` changes go through one
  reviewer.

## Parallel Example: User Story 3

```text
# Tests together (different files):
T064 contract tests        T065 posting tests        T066 immutability tests
T067 opening stock tests   T068 reversal tests       T069 replay test   T070 drift test

# Then, after T071–T076:
T077 frontend pages        T078 Playwright test
```

## Implementation Strategy

### MVP first

1. Phase 1 → Phase 2 → US1. Stop and validate quickstart steps 1–3 and 18.
2. Add US2 → US3 → US4 (all P1). Validate quickstart steps 4–13 and the concurrency checks.

### Incremental delivery

3. US5, US6, US7 (P2), then US8 (P3).
4. Polish: CI, README, test map, quickstart run.

Each increment is merged only when its tests pass and the project owner approves.
