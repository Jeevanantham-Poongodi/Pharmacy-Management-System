# Quickstart: validate Foundation (001)

How to run Foundation locally and prove it meets the spec. Implementation details are in
`tasks.md`; endpoints are in [contracts/openapi.yaml](contracts/openapi.yaml); tables are in
[data-model.md](data-model.md).

## Prerequisites

- Docker Desktop (for the local Supabase stack)
- Supabase CLI
- Python 3.12, Node.js 20+
- Branch `001-foundation` checked out in PMS-backend and PMS-frontend (created when
  implementation is approved; D-008)

## 1. Start the local database

```bash
cd backend
supabase start          # local Postgres + Auth in Docker
supabase db reset       # applies supabase/migrations/* and seed data
```

Expected: all migrations apply without error; the RLS check reports no table without RLS.

## 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill it from the `supabase start` output:
`DATABASE_URL` (role `pms_api`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_MODE` and, for `secret` mode, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS`.
Never commit `.env` (constitution, Operational safety).

Check the signing mode: if the project exposes `/auth/v1/.well-known/jwks.json` with keys, use
`jwks`; otherwise use `secret` (research R3).

## 3. Run the backend and its tests

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
ruff check . && ruff format --check .
pytest                       # unit + contract + integration (needs step 1)
uvicorn main:app --reload    # http://localhost:8000/api/v1/health → {"status":"ok"}
```

## 4. Run the frontend and its tests

```bash
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run lint && npm test
npm run dev                  # http://localhost:5173
npx playwright test          # end-to-end, needs steps 1–3 running
```

## 5. Acceptance walkthrough

Each check maps to the spec. All must pass before Foundation is marked complete.

| # | Do this | Expect | Spec |
| --- | --- | --- | --- |
| 1 | Sign in as the seeded administrator (MFA enrolled) | `/me` shows hospital, `admin` role | US1, FR-008 |
| 2 | Create users A (store) and B (pharmacist) with locations | Users can sign in; each sees only assigned locations | US1, FR-002–FR-005 |
| 3 | As A, call any endpoint with another hospital's location ID | `403 FORBIDDEN`, audit entry `access_denied` | FR-006, SC-001 |
| 4 | Create an item, a batch, a central store and a quarantine location | Saved; audit has before/after | US2 |
| 5 | Try to create the same batch number for the same item | `409 CONFLICT` | FR-011 |
| 6 | As A, raise opening stock for the central store; try to approve as A | `403 SELF_APPROVAL_FORBIDDEN` | FR-029, FR-041 |
| 7 | Approve as B | Document `posted`; balances and ledger lines match | D-017, FR-021, FR-024 |
| 8 | Resend step 7 with the same `Idempotency-Key` | Same response; no new ledger lines | FR-026, SC-002 |
| 9 | Resend with the same key and a different body | `422 IDEMPOTENCY_KEY_REUSED` | FR-026 |
| 10 | Request a FEFO proposal for more than the batches hold | Lines in D-005 order across batches, plus a shortfall | FR-032, FR-033 |
| 11 | Add a batch expiring today with stock; request a proposal | It is not proposed | FR-031 (D-012 temporary rule) |
| 12 | Put stock in the quarantine location; request a proposal | Never proposed | FR-030 |
| 13 | Raise a reversal of step 7 as A; approve as B | Balances return to zero; a second reversal is refused | FR-023 |
| 14 | Start a count, enter a variance, submit, approve as another user | One adjustment document posts | US8, FR-070–FR-072 |
| 15 | As auditor, search the audit trail and export it | Entries present; the export is itself audited | US6, FR-050–FR-052 |
| 16 | As a non-auditor, read the audit trail | `403` | FR-052 |
| 17 | Change the expiry alert windows; read the value as of yesterday | New value now; old value for yesterday | US7, FR-061 |
| 18 | Open the frontend and inspect network calls | No browser requests to Supabase tables; only Auth and the backend | FR-007, D-001 |

## 6. Automated checks that must pass in CI

- Concurrency test: parallel postings for the last units never over-issue (SC-003).
- Drift check detects a deliberately altered balance (FR-027, SC-005).
- Direct UPDATE/DELETE on `ledger_lines` and `audit_entries` fails (FR-022, FR-051, SC-006).
- Cross-hospital negative tests for every hospital-scoped endpoint (constitution, Tenant
  isolation).
- RLS present on every table.
