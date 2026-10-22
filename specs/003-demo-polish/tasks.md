# Tasks: Demo Polish

**Input**: `/specs/003-demo-polish/` (spec.md, plan.md)

**Tests**: included for the label map, the tour and the item reason dialog (D-018 test rule).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational

- [X] T001 Create `frontend/src/labels.ts` with label maps for trigger (`reorder_level`, `department_need`), notice source (`regulator`, `vendor`), chosen action (`ward`, `vendor`), order type (`IP`, `OP`), location kind (all 8 kinds), controlled class (`none`, `narcotic`, `schedule_x`), formulary status, and a `label(group, code)` fallback that replaces underscores
- [X] T002 [P] Create `frontend/src/hooks/useAsync.ts`: runs a loader when its dependencies change and returns `{ data, error, reload }` without calling setState synchronously inside an effect body
- [X] T003 [P] Move `daysUntil` to `frontend/src/components/expiry.ts`; move `FLOW_PATHS`/`flowFromPath` to `frontend/src/state/flowPaths.ts`; move `useReference` out of the provider file; move `actionLabel` to `frontend/src/components/actionLabel.ts`; move `validLines`/`EMPTY_LINE` and `hasNewCaseForm` to plain modules (lint: only-export-components)

## Phase 2: User Story 1 — Demo tour (P1)

- [X] T004 [US1] Create `frontend/src/components/DemoTour.tsx`: five steps (F1 `f1_qc` pass QC for the IV fluids and watch stock move from QC quarantine to the central store; F2 `f2_review` review the ICU indent and issue by FEFO; F3 `f3_order` verify OP-1090 and dispense; F4 `f4_writeoff` approve the expired cetirizine write-off; F5 `f5_dispensed` recall trace for OND-1188), each linking to `/flows/<flow>?node=<node>`; hide/show remembered in `localStorage` key `pms.demoTour.hidden` with try/catch
- [X] T005 [US1] Show `DemoTour` at the top of `frontend/src/pages/Dashboard.tsx`
- [X] T006 [US1] Empty filtered list in `frontend/src/pages/FlowCases.tsx` says "No cases at this step right now" with a "Show all" button clearing the filters (FR-003)
- [X] T007 [P] [US1] Test `frontend/tests/demoTour.test.tsx`: five links in flow order with the node filters; hide persists across remount

## Phase 3: User Story 2 — Items page (P2)

- [X] T008 [US2] Rebuild `frontend/src/pages/Items.tsx` with MUI (Paper, TextField, select fields, Table, Chip for inactive) and antd toasts; reason dialog for Deactivate/Reactivate (required reason, Cancel changes nothing); remove the `.app` wrapper route in `frontend/src/App.tsx`
- [X] T009 [P] [US2] Test `frontend/tests/items.test.tsx`: Deactivate opens the dialog; Confirm is disabled until a reason is typed; Cancel sends nothing

## Phase 4: User Story 3 — Readable labels (P2)

- [X] T010 [US3] Use `labels.ts` in `CaseDetail.tsx` (details), `Stock.tsx` (quarantine chip by kind), `LinesEditor.tsx` (item flags) and `Items.tsx`
- [X] T011 [P] [US3] Test `frontend/tests/labels.test.ts`: every listed code has a label without underscores; unknown codes fall back to words

## Phase 5: User Story 4 — Lint (P3)

- [X] T012 [US4] Use `useAsync` in `Dashboard.tsx`, `FlowCases.tsx`, `CaseDetail.tsx`, `Stock.tsx`; remove manual `useCallback` memoization flagged by the compiler; fix the remaining warning in `App.tsx`
- [X] T013 [US4] `npm run lint` reports 0 warnings

## Phase 6: Polish

- [X] T014 Run frontend lint, tests, build and backend tests; walk the tour in Chrome
- [X] T015 Commit on `003-demo-polish` referencing 003 and task IDs; push (no PR)

## Dependencies

T001–T003 first (shared modules). Stories are independent after that; T012 touches the pages
edited in T006, T008 and T010, so do it last.
