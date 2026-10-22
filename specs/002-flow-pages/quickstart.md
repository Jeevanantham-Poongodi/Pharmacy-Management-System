# Quickstart: validate Flow Pages (002)

## Setup

```bash
cd backend
.venv/bin/alembic upgrade head                 # applies 0002
.venv/bin/python scripts/bootstrap.py demo-data # fictional data; rerun-safe
.venv/bin/uvicorn main:app --reload             # :8000, DEMO_MODE=true in .env
cd ../frontend && npm run dev                   # :5173
```

## Automated checks

```bash
cd backend && .venv/bin/pytest && .venv/bin/ruff check . && .venv/bin/alembic check
cd frontend && npm run lint && npm test && npm run build
```

Expected: every Branch Inventory edge is covered (`test_flow_definitions.py`), FEFO and ledger
tests pass, `alembic check` reports no differences.

## Walkthrough (sign in as the demo admin)

| # | Do this | Expect | Spec |
| --- | --- | --- | --- |
| 1 | Open the dashboard | Open cases in all five flows; near-expiry buckets 30/60/90; quarantine totals | US6, SC-005 |
| 2 | Procurement → New requisition (formulary item) → take it to "Invoice matched, payment released", entering a batch and expiry at the GRN check | Stock page shows the batch in QC quarantine after GRN, then in Central Store after QC Pass | US1, FR-020 |
| 3 | Raise a non-formulary requisition; reject at "Committee approves?" | Ends via "Reject: notify requester…" to "Requisition closed"; reason required | US1, FR-005 |
| 4 | Ward indent for an item with two batches → approve → issue | Earlier-expiry batch issued first; ward balance rises | US2, FR-021, D-005 |
| 5 | Ward indent larger than pharmacy stock | Only "No" offered at "Enough stock in pharmacy?"; a linked Flow 1 case appears | US2, FR-021a |
| 6 | OP order for a narcotic | Only "Yes" at "Narcotic or Schedule X?"; dispense needs NDPS entry; only OP path after dispense | US3, FR-023 |
| 7 | Expiry → Run scan twice | Cases created once per batch-location in a window | US4, FR-024 |
| 8 | Recall a dispensed batch | Holdings listed; all stock moves to Recall Quarantine; patients listed on the Yes path | US5, FR-025 |
| 9 | Try an action not offered (API) | `409 INVALID_TRANSITION` | FR-002 |
