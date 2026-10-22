# Research: Foundation (001)

Each decision lists what was chosen, why, and what else was considered. Inputs: the spec,
the constitution draft, `docs/decisions.md`, and the current code in `backend/` and `frontend/`.

## Starting point (verified 2026-10-22)

- `backend/main.py`: one FastAPI file with `/`, `/hello` and `/test-db`. It creates a Supabase
  client from `SUPABASE_URL` / `SUPABASE_KEY`. The key's role claim is `anon`. No tests, no
  migrations, no lint configuration. CORS allows only `http://localhost:5173`.
- `backend/Dockerfile`: Python 3.12-slim, non-root user, `uvicorn main:app`. Deployed to EC2 by
  `.github/workflows/deploy.yml` through GHCR.
- `frontend/`: Vite + React 19 + TypeScript starter. `src/supabaseClient.ts` creates a Supabase
  client; `src/App.tsx` reads the `items` table directly (breaks D-001) and calls `/test-db`.
- `frontend/.env` is tracked and pushed, with the anon key (D-016, pending).

## R1. How the backend talks to the database so RLS applies to user requests

- **Decision**: the backend connects to Postgres directly with **psycopg 3** (connection pool)
  as a dedicated login role `pms_api`. For each user request it opens one transaction and runs:
  `SET LOCAL ROLE authenticated;` and
  `SELECT set_config('request.jwt.claims', <verified token claims>, true);`.
  Supabase's `auth.uid()` and `auth.jwt()` then return the signed-in user, so every RLS policy
  applies exactly as it would for that user. `pms_api` itself has no table privileges; it can
  only switch to `authenticated` (for user requests) or `pms_system` (for named system jobs).
- **Rationale**:
  - Real transactions are needed for all-or-nothing posting, row locks and idempotency
    (Principles XII, XIII). The Supabase REST client cannot run several statements in one
    transaction.
  - Running as `authenticated` with the user's claims makes RLS a true second layer (Tenant
    isolation), instead of being bypassed by a privileged key.
  - The claims come only from a token the backend has verified (R3), never from the browser.
- **Alternatives considered**:
  - *Supabase Python client with the user's token (REST)*: RLS applies, but no multi-statement
    transactions or row locks; posting would have to move into SQL functions, which puts
    business rules in the database (against Principle XI).
  - *Service-role key for everything*: simple, but bypasses RLS for every request; rejected by
    the constitution.
  - *SQLAlchemy ORM*: possible, but adds a layer the team does not need for explicit,
    lock-sensitive SQL. Repositories use plain SQL through psycopg.

## R2. Service-role use (named system jobs only)

- **Decision**: two named system operations in this feature, each audited with the job name:
  1. **User provisioning** (FR-002): creating and deactivating sign-in accounts needs the
     Supabase Auth admin API, which needs the service-role key. Only the admin endpoints call
     it, after the backend has checked that the caller is an administrator of that hospital.
  2. **Ledger drift check** (FR-027): a scheduled job that compares balances with ledger totals
     per hospital. It runs as database role `pms_system` with the hospital ID set explicitly.
- **Rationale**: the constitution allows the service role only for named, documented, audited
  jobs.
- **Alternatives considered**: letting users self-register (rejected by FR-002).

## R3. Verifying sign-in tokens and MFA

- **Decision**: the backend verifies the Supabase access token on every request with **PyJWT**:
  signature (against the project's JWKS endpoint when the project uses asymmetric signing keys,
  or the project JWT secret when it uses the legacy shared secret; chosen by configuration),
  expiry, issuer and audience `authenticated`. The `aal` claim must be `aal2` when the user holds
  a privileged role (FR-008); the list of privileged roles is configuration.
- **Rationale**: verifying locally avoids a network call per request and gives the claims that
  R1 needs. The `aal` claim is Supabase's standard MFA signal.
- **Alternatives considered**: calling the Supabase Auth `getUser` endpoint on every request
  (slower, an extra dependency on each request).
- **Open**: which signing mode the project uses is checked during setup (quickstart step 2).

## R4. Hospital scope and authorisation

- **Decision**: tables `hospital_members`, `user_roles`, `user_locations`. The backend loads the
  user's active membership after verifying the token. The hospital ID used in every query comes
  from that membership. RLS policies on every business table allow rows only where
  `hospital_id` is a hospital the current `auth.uid()` is an active member of. Permission checks
  (role × location × action) run in the domain layer; permissions per role are configuration
  rows (`role_permissions`).
- **Rationale**: two independent layers (backend checks and RLS), and nothing from the browser
  decides the scope (constitution, Tenant isolation).
- **Alternatives considered**: putting `hospital_id` in a custom JWT claim through an auth hook
  (adds a Supabase hook to maintain; can be added later if lookups become a cost).

## R5. Versioned migrations

- **Decision**: **Supabase CLI** migrations in the backend repo at `backend/supabase/migrations/`
  (timestamped SQL files). Developers run the local Supabase stack (`supabase start`, which runs
  in Docker) and apply migrations with `supabase db reset`. Shared environments get migrations
  with `supabase db push`, run by an authorised person until an automated pipeline step is
  approved. A CI check fails if any table lacks RLS (query on `pg_tables.rowsecurity`).
- **Rationale**: the constitution forbids dashboard schema changes; the CLI keeps SQL under
  version control and gives a real local Postgres with the `auth` schema for integration tests.
- **Alternatives considered**: Alembic (does not manage Supabase's `auth` schema or RLS helpers
  as naturally); hand-run SQL (not versioned).

## R6. Append-only ledger and audit at the database level

- **Decision**:
  - `ledger_lines`, `stock_documents` (once posted), `approvals` and `audit_entries` have no
    UPDATE or DELETE grant for `authenticated` or `pms_system`. A `BEFORE UPDATE OR DELETE`
    trigger on `ledger_lines` and `audit_entries` raises an error as a second guard. Posted
    documents are protected by a trigger that refuses changes when `status = 'posted'`.
  - Audit entries carry `prev_hash` and `entry_hash` (SHA-256 of the previous hash plus the
    entry) per hospital, so tampering is detectable (constitution: SHOULD be tamper-evident).
    Entries for one hospital are chained in insert order under an advisory lock.
- **Rationale**: these triggers back up a domain rule (append-only) and contain no business
  decisions, which Principle XI allows.
- **Alternatives considered**: application-only enforcement (rejected: Principle II requires the
  database layer too).

## R7. No negative balances and safe concurrent allocation

- **Decision**:
  - `stock_balances(hospital_id, item_id, batch_id, location_id, quantity)` with
    `CHECK (quantity >= 0)`.
  - Posting locks every balance row it touches with `SELECT … FOR UPDATE`, always in the order
    `(batch_id, location_id)` to avoid deadlocks, applies the changes, inserts the ledger lines,
    and commits. A shortfall found under the lock rolls the whole document back.
  - Allocation **proposals** (FR-030–FR-033) are read-only and are re-checked under lock when
    the calling feature posts. A proposal is never a reservation.
  - FEFO order: `ORDER BY expiry_date, first_receipt_posted_at, batch.id`, where
    `first_receipt_posted_at` is the posting time of the batch's first receipt or opening-stock
    document (D-005).
  - The expiry boundary is a setting, `allocation.block_on_expiry_date` (seed `true`, the
    temporary rule from D-012), read at runtime.
- **Rationale**: the CHECK constraint makes over-issue impossible even if a code path forgets a
  check; row locks make concurrent postings serial on the rows that matter.
- **Alternatives considered**: SERIALIZABLE isolation for everything (more retries, harder to
  reason about); reservations (more state, not needed until a flow requires them).

## R8. Idempotency

- **Decision**: table `idempotency_keys(hospital_id, user_id, operation, key, request_hash,
  response_status, response_body, created_at)`, primary key `(hospital_id, user_id, operation,
  key)`. In the **same transaction** as the posting:
  1. `SET LOCAL lock_timeout` from configuration, then
     `INSERT … ON CONFLICT DO NOTHING RETURNING`.
  2. If a concurrent request holds the same key, the insert waits; on lock timeout the request
     returns `409 REQUEST_IN_PROGRESS`.
  3. If a completed row exists: same `request_hash` → return the stored response; different
     hash → `422 IDEMPOTENCY_KEY_REUSED`.
  4. Otherwise do the work and store the response in the row before commit.
  If the transaction rolls back, the key row disappears with it, so a retry runs again (only
  completed postings count). `stock_documents.idempotency_key` has a unique constraint per
  hospital as the second guard. Key retention is a setting; a system job deletes expired keys.
- **Rationale**: matches constitution Principle XII exactly with no extra coordination service.
- **Alternatives considered**: a separate "in progress" row committed before the work (needs
  clean-up of abandoned rows); Redis (a new technology, needs an amendment).

## R9. Backend layout and tooling

- **Decision**: package `backend/app/` with `api/v1/` (routes), `domain/` (services, all business
  rules), `repositories/` (SQL), `core/` (config, auth, db, errors, idempotency, logging).
  `backend/main.py` stays as the entry point the Dockerfile already uses and only imports the
  app. Tooling: ruff (lint + format) and pytest. Database access is synchronous (psycopg pool,
  run in FastAPI's thread pool), which keeps transaction code simple. Contract tests use
  **openapi-core** to validate every request and response against `contracts/openapi.yaml`.
- **Rationale**: matches Principle XI layering and keeps the existing Docker and deploy files
  working.
- **Alternatives considered**: async psycopg (more complex, no measured need yet).

## R10. Frontend

- **Decision**: keep Vite + React 19 + TypeScript strict. Add React Router, an API client module
  (fetch wrapper that attaches the bearer token, sends `Idempotency-Key` on posting calls and
  parses the error envelope), and screens for: sign-in (with MFA step), user admin, master data,
  stock balances, opening stock, reversals and approvals, stock counts, audit search, settings.
  `supabaseClient.ts` is kept for **auth only**; the `items` query in `App.tsx` and the call to
  `/test-db` are removed. Tests: Vitest + React Testing Library; Playwright for end-to-end.
- **Rationale**: D-001 and the constitution's testing stack.
- **Alternatives considered**: a UI component library (not needed to deliver the feature; can be
  added later without an amendment as it is not a framework change).

## R11. Existing backend endpoints

- **Decision**: remove `/test-db` (reads a table with the anon key, and the browser calls it);
  replace `/` and `/hello` with `GET /api/v1/health` (Monitoring requirement). The Docker health
  check in `docker-compose*.yml` is pointed at the new path.
- **Rationale**: constitution (health check, `/api/v1` prefix) and D-001.

## R12. Configuration and secrets

- **Decision**: backend settings through `pydantic-settings` from environment variables:
  `DATABASE_URL` (role `pms_api`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (user provisioning
  only), `SUPABASE_JWT_MODE` (`jwks` or `secret`), `SUPABASE_JWT_SECRET` (only for `secret`
  mode), `CORS_ORIGINS`. Frontend: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. Each repo gets a committed `.env.example` with names only. Changing
  the tracked `frontend/.env` waits for D-016 approval.
- **Business thresholds** (alert windows, privileged roles, expiry boundary, idempotency key
  retention, lock timeout, drift-check schedule) live in the `settings` table per hospital, not
  in environment variables or code (Principle VIII).

## Still pending (not decided by this plan)

D-002 region, D-003 frontend host, D-004 compliance, D-011 FEFO override, D-012 final expiry
boundary, D-014 further SoD rules, D-015 backup targets, D-016 exposed configuration, and OI-6,
OI-7, OI-10, OI-11 from the spec. None of them blocks building this feature; D-002, D-003, D-004,
D-015 and D-016 block production go-live.
