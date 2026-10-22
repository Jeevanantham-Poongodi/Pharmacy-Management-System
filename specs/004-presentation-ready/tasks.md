# Tasks: Presentation Ready

**Input**: `/specs/004-presentation-ready/` (spec.md, plan.md, quickstart.md)

## Phase 1: User Story 1 — Demo reset (P1)

- [X] T001 [US1] Add `demo-reset` to `backend/scripts/bootstrap.py`: resume an unfinished load in the account's active hospital, else create "Demo Hospital <timestamp>", deactivate the account's other memberships, add admin membership, commit, then call `scripts.demo_data.load` (FR-001, FR-003)
- [X] T002 [US1] Test `backend/tests/test_demo_reset_db.py` in a rolled-back transaction: membership switch leaves exactly one active membership and no append-only row changed (FR-002)
- [X] T003 [US1] Run the reset against the shared database before the rehearsal

## Phase 2: User Story 2 — Rehearsal (P1)

- [X] T004 [US2] Walk quickstart.md rows 1–14 in Chrome; record defects in this file
- [X] T005 [US2] Fix each defect, with a test where testable; rerun the affected rows

## Phase 3: User Story 3 — READMEs (P2)

- [X] T006 [P] [US3] Rewrite `README.md` (overview, five flows, architecture, quick start, branches and decisions)
- [X] T007 [P] [US3] Rewrite `backend/README.md` (env, migrations, bootstrap commands, API, tests, deploy note)
- [X] T008 [P] [US3] Rewrite `frontend/README.md` (env, scripts, screens, structure)

## Phase 4: Polish

- [X] T009 Run backend and frontend checks. (The second demo reset was dropped at the project owner's request: keep the current demo data, including what the rehearsal moved on. Run `demo-reset` by hand when a fresh copy is wanted.)
- [X] T010 Commit on `004-presentation-ready` referencing 004 and task IDs; push (no PR)

## Defects found in rehearsal

All 14 quickstart rows were walked in Chrome on 2026-10-23 against freshly reset demo data; no
console errors.

| ID | Defect | Fix | Test |
| --- | --- | --- | --- |
| D1 | Pages took 5–8 s to load: every request doubled by React StrictMode in the dev server; profile, reference data and page data loaded one after another; ~7 database round trips per request just to identify the user; FEFO re-read the same setting and date per line | `npm run demo` serves the production build; reference data loads in parallel with the profile (`state/referenceData.ts`); signed-in user cached 60 s per token (`core/auth.py`); role and claims set in one statement (`core/db.py`); per-move cache of date, setting and locations and batched ledger inserts (`domain/effects.py`, `repositories/stock.py`). Dashboard now ~2.3 s cold, ~0.3 s between screens | Full backend suite; RLS verified still applied |
| D2 | A blank quantity field in a dialog (e.g. a line with nothing returned) made the whole step fail | Frontend leaves blank fields out; backend treats blank as not entered | `test_flow2_db.py::test_blank_quantity_fields_are_ignored_and_issue_records_ward`, `actionPanelInputs.test.tsx` |
| D3 | Return dialog showed "(requested 20)" when 12 were issued | Shows the issued quantity | `actionPanelInputs.test.tsx` |
| D4 | Issued lines showed no location | Issue records the ward on the line | `test_flow2_db.py::test_blank_quantity_fields_are_ignored_and_issue_records_ward` |
| — | Once, the tab jumped to the procurement list and dashboard after a click | Not reproduced in the rest of the rehearsal; no code navigates on its own (likely another click in the shared browser window) | — |
