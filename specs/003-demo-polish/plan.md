# Implementation Plan: Demo Polish

**Branch**: `003-demo-polish` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-demo-polish/spec.md`

## Summary

Frontend-only polish of feature 002: a dismissible demo tour on the dashboard that links to
seeded cases by flow step, the Items page rebuilt with MUI/antd and an in-page reason dialog,
one shared label map for stored codes, and a lint-clean codebase (helpers moved out of
component files, data loading without synchronous setState in effects).

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19

**Primary Dependencies**: MUI 9, antd 6, react-router-dom (no new dependencies)

**Storage**: browser `localStorage` for the tour's hidden flag only (wrapped in try/catch)

**Testing**: Vitest + Testing Library; existing backend suite unchanged

**Target Platform**: local demo, as feature 002

**Project Type**: web application (frontend only)

**Performance Goals**: none beyond feature 002

**Constraints**: no backend, data or API changes; D-001 unchanged

**Scale/Scope**: 6 screens touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Rule | How this plan meets it | Pre | Post |
| --- | --- | --- | --- |
| Business-Process Reference (D-010) | Tour only links to existing steps; no flow change | Pass | Pass |
| VII Audit | Item activate/deactivate still sends the reason the API audits | Pass | Pass |
| X Patient data | Tour and labels add no patient data | Pass | Pass |
| XI Modular frontend | Labels in one module; components stay business-free | Pass | Pass |
| XII Contracts | No API change | Pass | Pass |
| IX Tests (D-018) | Tests for the label map, tour and item dialog | Pass | Pass |

## Project Structure

### Documentation (this feature)

```text
specs/003-demo-polish/
├── plan.md
├── spec.md
├── checklists/requirements.md
└── tasks.md
```

No research, data model or contract artifacts: no unknowns, no data, no interface change.

### Source Code

```text
frontend/src/
├── labels.ts                       # readable labels for stored codes (FR-005)
├── components/DemoTour.tsx         # FR-001, FR-002
├── components/expiry.ts            # daysUntil, moved out of ExpiryChip.tsx (lint)
├── hooks/useAsync.ts               # load-in-effect without synchronous setState (lint)
├── pages/Items.tsx                 # rebuilt (FR-004)
├── pages/Dashboard.tsx, FlowCases.tsx, CaseDetail.tsx, Stock.tsx
└── state/reference.tsx, state/flowPaths.ts
```

## Complexity Tracking

None.
