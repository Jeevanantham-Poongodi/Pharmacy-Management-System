# Implementation Plan: Foundation

**Branch**: `001-foundation` (to be created by hand in each affected repo when implementation is
approved; D-008) | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

Foundation delivers the shared base the five flows in the diagram build on: verified sign-in,
roles, location access and one-hospital tenancy; master data (items, batches, locations,
vendors); an append-only, batch-level stock ledger with document posting that is idempotent,
all-or-nothing and never negative; FEFO allocation proposals (D-005, D-013); approvals with
raiser ≠ approver; a hash-chained audit trail; dated configuration; opening stock (D-017) and
stock take (D-007).

Technical approach (research.md): FastAPI backend in layers (routes → domain → repositories)
talking to Supabase Postgres through psycopg as role `pms_api`, switching to `authenticated` with
the verified user's claims inside each transaction so RLS always applies (R1). The service role
is used only by two named, audited jobs (R2). Database constraints and triggers back up the
append-only, non-negative and raiser ≠ approver rules (R6, R7); idempotency uses a key table in
the same transaction (R8). Migrations are versioned with the Supabase CLI (R5). The frontend uses
Supabase only for sign-in and calls the backend for everything else (D-001).

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript ~6.0 strict, React 19 (frontend)

**Primary Dependencies**: FastAPI, Uvicorn, psycopg 3 (+ psycopg_pool), pydantic /
pydantic-settings, PyJWT (with JWKS support), supabase-py (Auth admin calls only); React Router,
@supabase/supabase-js (Auth only)

**Storage**: Supabase PostgreSQL; migrations with Supabase CLI in `backend/supabase/migrations/`

**Testing**: pytest (unit, contract with openapi-core, integration against the local Supabase
stack); Vitest + React Testing Library; Playwright (end-to-end)

**Target Platform**: Backend in Docker on AWS EC2 (region pending, D-002); frontend host pending
(D-003)

**Project Type**: Web application (separate backend and frontend repositories)

**Performance Goals**: none set; targets are open item OI-11 and are not invented here

**Constraints**: no business threshold in code (settings table); no browser access to Supabase
data (D-001); every table has RLS and `hospital_id`; posting is idempotent and transactional

**Scale/Scope**: one hospital (D-006); volumes not specified; design does not assume a limit

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Rule | How this plan meets it | Pre | Post |
| --- | --- | --- | --- |
| I Batch-level traceability | Balances and ledger keyed by item + batch + location; batch carries expiry | Pass | Pass |
| II Append-only ledger | Documents → ledger lines; no UPDATE/DELETE grants + triggers; reversal documents; drift check | Pass | Pass |
| III Quarantine is a location | Location types `qc`, `quarantine` with `allocatable = false`; allocation filters on it in the repository query | Pass | Pass |
| IV FEFO | D-005 order in one query; split across batches (D-013); no override (D-011); expiry boundary from a setting (D-012 temporary rule); CHECK ≥ 0 | Pass | Pass |
| V Segregation of duties | Domain check on user identity + DB trigger on `approvals`; further rules wait for D-014 | Pass | Pass |
| VI NDPS / Schedule X | Only the item classification is stored; no register in 001 (D-004 pending) | Pass (n/a) | Pass (n/a) |
| VII Audit trail | Hash-chained `audit_entries`, insert-only, read limited by permission, exports audited | Pass | Pass |
| VIII Configuration | `settings` + `setting_history`; seed values only where the diagram or a decision gives them | Pass | Pass |
| IX Test-first | tasks.md orders tests before code; branch-to-test map below | Pass | Pass |
| X Patient data | Foundation stores no patient data | Pass (n/a) | Pass (n/a) |
| XI Modular layering | `app/api`, `app/domain`, `app/repositories`; later features post only through the posting service | Pass | Pass |
| XII Contracts and idempotency | `contracts/openapi.yaml`; error envelope; key table per R8; contract tests | Pass | Pass |
| XIII Transactions | One transaction per posting; ordered row locks; CHECK constraint | Pass | Pass |
| XIV Traceability | FR IDs and diagram nodes in spec; tasks cite FR / US IDs | Pass | Pass |
| Business-Process Reference | Scope table in spec cites nodes; stock take marked as D-007 only; gaps recorded | Pass | Pass |
| Read path (D-001) | Frontend Supabase client limited to Auth; `App.tsx` table read and `/test-db` removed | Pass | Pass |
| Tenant isolation | Hospital from membership; RLS via `authenticated` role + claims; service role for two named jobs | Pass | Pass |
| Operational safety | `.env.example` only; health endpoint; structured logs with request ID; alerts on drift | Pass | Pass |
| Data residency (D-002), hosting (D-003), backups (D-015), D-016 | Not decided by this plan; recorded as go-live blockers | Pending | Pending |

No violations need justification; Complexity Tracking is empty.

### Branch-to-test map (Principle IX)

Foundation implements no diagram decision node end to end, so the map lists the shared rules
the nodes depend on:

| Rule | Diagram nodes that depend on it | Tests (tasks.md) |
| --- | --- | --- |
| FEFO order and split | `F2:"Issue approved quantity, earliest expiry first"`, `F3:"Dispense from earliest-expiry batch"` | US4 tests |
| Non-allocatable QC / quarantine | `F1:"Quarantine for QC"`, `F4:"Expired: quarantine"`, `F5:"Block and quarantine batches"` | US2, US4 tests |
| Raiser ≠ approver | `F1:"HOD approves requisition?"`, `F1:"Finance approves PO?"`, `F1:"Retrospective approval?"`, `F4:"Write-off approved?"` | US5 tests |
| Posting, reversal, idempotency | Every stock box | US3 tests |

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (affected repositories)

```text
backend/                          # PMS-backend
├── main.py                       # kept as entry point; imports app.main:app
├── requirements.txt              # runtime deps
├── requirements-dev.txt          # pytest, ruff, openapi-core
├── pyproject.toml                # ruff + pytest config
├── .env.example                  # names only
├── supabase/
│   ├── config.toml
│   ├── migrations/               # timestamped SQL (R5)
│   └── seed.sql                  # roles, permissions, setting seeds, dev hospital
├── app/
│   ├── main.py                   # FastAPI app factory, middleware, routers
│   ├── core/                     # config, auth (JWT/JWKS, MFA), db (pool, user tx),
│   │                             # errors (envelope), idempotency, logging, request_id
│   ├── api/v1/                   # health, me, users, roles, items, batches, locations,
│   │                             # vendors, stock, stock_documents, stock_counts, audit, settings
│   ├── domain/                   # access, master_data, posting, allocation, approvals,
│   │                             # audit, settings, stock_count
│   ├── repositories/             # one module per table group (plain SQL)
│   └── jobs/                     # ledger_drift_check
└── tests/
    ├── unit/
    ├── contract/
    └── integration/

frontend/                         # PMS-frontend
├── .env.example
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # router only; Supabase table read removed
│   ├── supabaseClient.ts         # Auth only
│   ├── api/                      # client.ts (bearer, idempotency key, error envelope)
│   ├── auth/                     # sign-in, MFA step, session context
│   ├── pages/                    # users, master data, balances, documents, counts,
│   │                             # audit, settings
│   └── components/
├── tests/                        # Vitest + RTL
└── e2e/                          # Playwright
```

**Structure Decision**: web application across the two existing repositories. The root specs
repo holds only Spec Kit artifacts. `backend/main.py` and the Dockerfile's `uvicorn main:app`
stay valid so the existing deploy workflow keeps working.

## Implementation notes for later phases

- Changing the tracked `frontend/.env` and removing it from git waits for the D-016 decision.
- The deploy workflow is not changed in this feature beyond the health-check path; migrations to
  shared environments are applied with `supabase db push` by an authorised person (R5).
- New environment variables for EC2 (R12) are added to the server by its operator; no secret is
  committed.

## Complexity Tracking

No constitution violations to justify.
