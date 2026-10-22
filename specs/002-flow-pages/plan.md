# Implementation Plan: Flow Pages

**Branch**: `002-flow-pages` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-flow-pages/spec.md`

## Summary

Screens and backend support for all five flows of the diagram, under D-018 (demo scope). Each
flow's Branch Inventory is encoded once as a state machine (research R1); a generic case engine
moves cases along diagram arrows, checks approvals (R5) and data-driven decisions (R2), applies
stock effects through a simplified stock layer (ledger + non-negative balances, R3; FEFO, R4),
and records history and audit entries in one transaction. The React frontend renders every flow
from the same definitions, plus a dashboard and a stock page. A demo-data loader drives cases
through the same services (R7).

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript ~6.0, React 19 (frontend)

**Primary Dependencies**: FastAPI, psycopg 3, pydantic, SQLAlchemy + Alembic (schema only);
MUI 9, antd 6, react-router-dom, @supabase/supabase-js (Auth only)

**Storage**: Supabase PostgreSQL; Alembic revision `0002`

**Testing**: pytest (unit for definitions/FEFO; integration against the database for ledger,
RLS and case moves); Vitest for UI rendering from definitions

**Target Platform**: local demo (backend on :8000, frontend on :5173) against the online
Supabase project

**Project Type**: web application (backend + frontend folders in one repository)

**Performance Goals**: interactive use by one presenter; pages load in under 2 s

**Constraints**: D-001 (browser data only through FastAPI), RLS on every table, D-018 relaxations

**Scale/Scope**: one hospital, ~30 items, ~8 locations, tens of cases per flow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Rule | How this plan meets it | Pre | Post |
| --- | --- | --- | --- |
| I Batch-level traceability | Every ledger line and case line carries item + batch + location; recall trace reads them | Pass | Pass |
| II Append-only ledger | Documents → ledger lines; append-only trigger; no UPDATE/DELETE grants; balances from trigger | Pass | Pass |
| III Quarantine is a location | Three quarantine kinds, `allocatable = false`, filtered in the allocation query | Pass | Pass |
| IV FEFO | D-005 order, D-013 split, D-012 temporary rule, no override (D-011) | Pass | Pass |
| V Segregation of duties | Raiser ≠ approver and NDPS two users in domain code; **relaxed under `DEMO_MODE` (D-018)** | Justified | Justified |
| VI NDPS controls | Register entry with two sign-offs must exist before the dispense edge | Pass | Pass |
| VII Audit trail | Every case move and posting calls `app.audit_append` in the same transaction | Pass | Pass |
| VIII Configuration | Alert windows from `hospital_settings` (`expiry.alert_windows_days`); D-012 temporary rule from `allocation.block_on_expiry_date` (default `true`) | Pass | Pass |
| IX Test-first | **Reduced by D-018**: every Branch Inventory edge tested; FEFO, ledger, quarantine tests | Justified | Justified |
| X Patient data | Fictional patient reference only; no names in audit payloads | Pass | Pass |
| XI Modular domains | Routes → domain (`flows`, `stock`) → repositories; flows change stock only via `stock.post_document` | Pass | Pass |
| XII Contract-first | [contracts/openapi.yaml](contracts/openapi.yaml) agreed before code; **no idempotency keys (D-018)** | Justified | Justified |
| XIII Transactions | Each move = one transaction; negative balance aborts; **no concurrency design (D-018)** | Justified | Justified |
| XIV Traceability | Node keys cite diagram labels; tasks cite FR IDs; commits cite 002 + task IDs | Pass | Pass |
| Tenant isolation | `hospital_id` on every table; RLS via `app.current_hospital_ids()` | Pass | Pass |

## Project Structure

### Documentation (this feature)

```text
specs/002-flow-pages/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models.py                    # + stock and case models (Alembic source)
│   ├── flows/definitions.py         # Branch Inventory as data (R1, R2)
│   ├── domain/stock.py              # post_document, allocate_fefo (R3, R4)
│   ├── domain/flows.py              # create_case, available_actions, take_action (R5)
│   ├── domain/effects.py            # stock effects per edge (FR-020–FR-025)
│   ├── domain/expiry.py             # daily scan (FR-024)
│   ├── repositories/stock.py, cases.py, masters.py
│   └── api/v1/flows_routes.py, stock_routes.py, schemas.py
├── alembic/versions/0002_flow_pages.py
├── scripts/bootstrap.py             # + demo-data (R7)
└── tests/test_flow_definitions.py, test_fefo.py, test_flow_cases_db.py, test_flows_api.py

frontend/src/
├── App.tsx                          # router + signed-in shell
├── layout/AppShell.tsx
├── api/index.ts                     # + flows, cases, stock calls
├── components/FlowMap.tsx, ActionPanel.tsx, CaseHistory.tsx, LinesTable.tsx
└── pages/Dashboard.tsx, FlowCases.tsx, CaseDetail.tsx, Stock.tsx, Items.tsx, newCase/*.tsx
```

**Structure Decision**: existing `backend/` and `frontend/` folders, following the layering
already used by the item master (`api/v1` → `domain` → `repositories`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| V relaxed under demo mode | One demo account must walk every flow (D-018) | Seeded per-role accounts: rejected by the project owner for the demo |
| IX reduced | All five flows in one demo feature (D-018) | Strict test-first per flow: many features before any flow screen |
| XII no idempotency keys | Demo has one presenter; no retried postings | Full key table: Foundation scope, not needed for the demo |
| XIII no concurrency design | Single user; DB still refuses negative balances | Row locking design: Foundation scope |
