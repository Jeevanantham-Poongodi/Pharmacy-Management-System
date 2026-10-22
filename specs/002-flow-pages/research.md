# Research: Flow Pages (002)

Decisions taken while planning. Each records what was chosen, why, and what was rejected.

## R1. The diagram as data: one generic case engine

- **Decision**: each flow is a state machine defined once in the backend
  (`app/flows/definitions.py`): nodes (key, exact diagram label, kind start | task | decision |
  end) and edges (from, to, outcome label, and options: approval, reason required, guard, stock
  effect, input fields). One set of tables (`flow_cases`, `flow_case_lines`, `flow_events`) holds
  every case of every flow. The frontend renders from `GET /api/v1/flows`.
- **Rationale**: SC-001 needs every node and arrow present; having the Branch Inventory as one
  data structure lets a single test walk it, and the UI cannot drift from the backend. Five flows
  share the same mechanics (move, history, audit, approval check).
- **Alternatives**: one table and one set of endpoints per flow document (requisitions, POs,
  indents…) — closer to Foundation's long-term model but five times the code for a demo
  (D-018); a workflow library — adds a dependency for what is a small dictionary.

## R2. Decision nodes answered by data (guards)

- **Decision**: decision nodes whose answer is a fact in the data offer only the edge that
  matches it: `F1:"Formulary item?"` (item flag), `F3:"Narcotic or Schedule X?"` (item class),
  `F3:"IP or OP?"` (order type), `F2:"Enough stock in pharmacy?"` and `F3:"In stock?"` (FEFO
  allocation result), `F5:"Already dispensed to patients?"` (dispense movements of the batch).
  Other decisions are human judgments and offer every outgoing edge.
- **Rationale**: spec US3 scenario 4 (only the IP path for an IP order); prevents taking a path
  the data contradicts.
- **Alternatives**: always offer every edge — lets a user mark a narcotic as non-controlled.

## R3. Stock layer: ledger plus trigger-maintained balances

- **Decision**: `stock_documents` → `ledger_lines` (signed quantities). An `after insert` trigger
  on `ledger_lines` upserts `stock_balances`, which has `check (qty >= 0)`; a negative result
  aborts the whole posting transaction. Both ledger and register tables are append-only through
  the existing `app.forbid_update_delete()` trigger and grants without UPDATE/DELETE.
- **Rationale**: Principle II and FR-012 with the least code; the database refuses negatives even
  if domain code is wrong. Balance-equals-ledger is checked by a test (SC-003).
- **Alternatives**: balances as a view over the ledger (no place for the `>= 0` check);
  Foundation's full design with idempotency and row locks (relaxed by D-018).

## R4. FEFO allocation query

- **Decision**: one SQL query over `stock_balances` joined to `batches` and `locations`, filtered
  by `locations.allocatable`, `not batches.blocked`, `expiry_date > today` in the hospital time
  zone (D-012 temporary rule), ordered by `expiry_date, first_receipt_at, batch.id` (D-005), then
  split in Python across rows until the quantity is covered (D-013); the remainder is the
  shortfall.
- **Rationale**: deterministic and testable; the order lives in one place.

## R5. Approvals and demo mode

- **Decision**: edges flagged `approval` require permission `flows.approve` and, unless
  `DEMO_MODE`, an actor different from the case's `raised_by`. NDPS entry stores two sign-off
  user IDs; unless `DEMO_MODE` they must differ from each other.
- **Rationale**: FR-004, FR-023, D-018.

## R6. Migrations

- **Decision**: add SQLAlchemy models to `app/models.py` and generate Alembic revision `0002`
  with autogenerate, then add RLS, grants, policies, triggers and the seed permissions by hand
  with `op.execute` in the same revision (as the template reminds).
- **Rationale**: the project's migration path since PR #1.

## R7. Demo data runs through the domain services

- **Decision**: `scripts/bootstrap.py demo-data` creates master data and opening stock (D-017),
  then creates and moves cases by calling the same domain functions the API uses, acting as the
  demo user (transaction switched to `authenticated` with that user's claims). It is skipped if
  the hospital already has a location (rerun-safe).
- **Rationale**: seeded history, audit entries and balances are produced exactly like real use,
  so the demo data cannot contain states the engine would not allow.

## R8. Frontend structure

- **Decision**: add `react-router-dom`. A signed-in shell (MUI Drawer + AppBar) with routes
  `/` dashboard, `/flows/:flow` case list, `/cases/:id` case page, `/stock`, `/items`. Generic
  components: `FlowMap` (nodes of the flow with the current and visited ones marked),
  `ActionPanel` (one button per available edge, reason / input form when needed),
  `CaseHistory` (antd Timeline). Per-flow "new case" forms are small dialogs.
- **Rationale**: matches the generic engine (R1); MUI for layout and forms, Ant Design for
  feedback and timeline, as chosen in feature 001's login work.
