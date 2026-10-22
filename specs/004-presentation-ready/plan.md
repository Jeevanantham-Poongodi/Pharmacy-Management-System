# Implementation Plan: Presentation Ready

**Branch**: `004-presentation-ready` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Add `bootstrap.py demo-reset` (new hospital, membership switch, demo data load, resumable),
rehearse every screen in Chrome and fix what breaks, and rewrite the three READMEs.

## Technical Context

**Language/Version**: Python 3.12, TypeScript ~6.0 · **Dependencies**: unchanged ·
**Storage**: Supabase PostgreSQL, no schema change · **Testing**: pytest, Vitest, Chrome
rehearsal · **Constraints**: append-only tables untouched (FR-002); D-001, D-018 unchanged

## Constitution Check

| Rule | How this plan meets it | Pre | Post |
| --- | --- | --- | --- |
| II / VII append-only | Reset creates a new hospital; it never updates or deletes ledger, audit or history | Pass | Pass |
| Tenant isolation (D-006) | Old and new demo data are separate hospitals; the account is active in one | Pass | Pass |
| Operational safety | Reset writes to the shared database only when run by the operator | Pass | Pass |

## Design

- **Reset** (`scripts/bootstrap.py`): find the demo account; if an active membership points at a
  hospital whose demo load is unfinished, resume it; otherwise create "Demo Hospital <date-time>"
  with `create_hospital`, deactivate the account's other memberships, add it as admin with
  `add_member`, commit, then run `scripts/demo_data.load` (already resumable by stage).
- **Rehearsal**: [quickstart.md](quickstart.md) checklist; fixes go in the affected screen with a
  test.
- **READMEs**: root (overview, flows, architecture, quick start), backend (env, migrations,
  commands, API, tests), frontend (env, scripts, screens).
