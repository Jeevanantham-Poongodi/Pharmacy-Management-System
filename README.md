# Pharmacy Management System

A hospital pharmacy system for an Indian hospital, built as a college project. It runs the five
pharmacy processes in [docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf](docs/flows/Hospital_Pharmacy_System_Flow_v2.pdf)
end to end, with batch-level stock, earliest-expiry-first (FEFO) issuing, quarantine and an
audit trail.

## The five flows

Every box and arrow of the flow diagram exists in the application: a case is always at one box,
and the buttons on its page are exactly the arrows leaving that box, labelled as in the diagram.

| # | Flow | What you can do |
| --- | --- | --- |
| 1 | Procurement | Requisition → formulary check / drug committee → HOD approval → rate contract or RFQ → PO → Finance approval → vendor response → GRN check → QC quarantine → stock in central store. Emergency local purchase with retrospective approval. |
| 2 | Ward indent | Ward, OT or ICU indent → pharmacist review (full or partial) → FEFO issue, or a linked requisition when the pharmacy is short → receipt check → returns (restock or quarantine). |
| 3 | Patient dispensing | IP or OP order → verification and prescriber queries → substitute or emergency purchase → NDPS register with dual sign-off for narcotics → FEFO dispense → IP billing and nursing, or OP billing and counselling → returns. |
| 4 | Expiry management | Daily scan for stock expiring within 90/60/30 days → move to a ward or return to vendor → watch list → expired quarantine → write-off approval → disposal. |
| 5 | Recall | Recall notice → find the batch in every store and ward → block and quarantine → trace patients who received it → return to vendor. |

The dashboard has a demo tour that links to a waiting case in each flow.

## How it is built

```
Browser (React, MUI, Ant Design)
   │  Supabase Auth: sign-in only
   │  everything else: REST /api/v1 with the access token
   ▼
FastAPI backend ──► Supabase PostgreSQL (row-level security on every table)
   routes → domain services (flow engine, stock, FEFO) → repositories (SQL)
```

- **Flows as data**: [backend/app/flows/definitions.py](backend/app/flows/definitions.py) encodes
  the diagram; the frontend draws every flow screen from it. A test checks it against the spec's
  list of every arrow.
- **Stock**: every movement is a posted document with append-only ledger lines; balances can
  never go negative; quarantine locations are never issued from.
- **Security**: the browser never reads tables directly (decision D-001); each request runs in
  the database as the signed-in user, so row-level security applies.

## Quick start

You need Python 3.12, Node.js 20+, and the project's Supabase credentials in `backend/.env` and
`frontend/.env` (see each README; never commit them).

```bash
# Backend: http://localhost:8000
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head
.venv/bin/python scripts/bootstrap.py demo-user --email demo@pharmacy.local --password '<choose one>'
.venv/bin/python scripts/bootstrap.py demo-data
.venv/bin/uvicorn main:app --reload

# Frontend: http://localhost:5173
cd frontend
npm install
npm run demo        # production build, best for presenting (npm run dev while developing)
```

Open http://localhost:5173 and click either field: the demo account fills in.

**Before a presentation**, give the demo a fresh copy of its data (about a minute; nothing is
deleted, see [backend/README.md](backend/README.md#demo-account-and-data)):

```bash
cd backend && .venv/bin/python scripts/bootstrap.py demo-reset
```

## Repository map

| Path | What is there |
| --- | --- |
| [backend/](backend/) | FastAPI API, Alembic migrations, demo scripts, tests ([README](backend/README.md)) |
| [frontend/](frontend/) | React app ([README](frontend/README.md)) |
| [docs/flows/](docs/flows/) | The flow diagram: the only business-process reference |
| [docs/decisions.md](docs/decisions.md) | Decision register (D-001 … D-018) |
| [specs/](specs/) | Spec Kit features: spec, plan, tasks and contracts for each feature |
| [.specify/memory/constitution.md](.specify/memory/constitution.md) | Engineering rules (draft) |

Features: 001 foundation (sign-in, item master, audit), 002 flow pages, 003 demo polish,
004 presentation ready.

## Demo scope

This is a demonstration build (decision [D-018](docs/decisions.md)). One demo account can take
every step, including approvals and both NDPS sign-offs, and some production safeguards
(duplicate-submission protection, concurrency design) are not built. It is not for real
patients or stock. All demo data, including patient references, is fictional.
