# Feature Specification: Presentation Ready

**Feature Branch**: `004-presentation-ready` (created by hand per D-008)

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Make the application ready to present: a demo data reset, a full
browser rehearsal of every screen with fixes, and up-to-date READMEs."

## Sources and Scope

Follow-up to features 002 and 003 under D-018 (demo scope). No change to the flows (D-010) or
their rules. Ledger, audit and case history stay append-only: a reset never deletes them.

**Out of scope**: hosting, merging branches, role-based accounts, new screens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reset the demo before each presentation (Priority: P1)

An operator runs one command and the demo account sees a fresh set of demo data, with every
tour step waiting again, while the previous demo data stays in the database untouched.

**Why this priority**: every rehearsal uses up demo cases.

**Independent Test**: take a tour case to its end, run the reset, sign in again: the dashboard
shows the original open cases and the tour step has its case back.

**Acceptance Scenarios**:

1. **Given** the demo account's hospital has used-up demo data, **When** the reset runs, **Then**
   a new demo hospital is created and loaded, the demo account becomes its member with the
   administrator role, and its membership in the previous hospital is made inactive.
2. **Given** a reset, **When** the database is inspected, **Then** no ledger line, audit entry or
   case event was updated or deleted.
3. **Given** the reset is interrupted, **When** it is run again, **Then** it completes the same new
   hospital instead of creating another.

### User Story 2 - Every screen works in a rehearsal (Priority: P1)

A presenter clicks through every flow end to end, every "New" form, linked cases, the expiry
scan and the recall trace in the browser without errors.

**Independent Test**: the rehearsal checklist in quickstart.md is completed with no console
errors; any defect found is fixed and covered by a test.

### User Story 3 - The READMEs describe the real application (Priority: P2)

A reviewer can set up and run the project, load the demo data and find their way around the
five flows from the READMEs alone.

**Independent Test**: following the README from a fresh clone (with the `.env` values) reaches
the dashboard with demo data.

### Edge Cases

- The demo account has no hospital yet: the reset tells the operator to run `demo-user` first.
- The connection drops mid-reset: rerunning resumes (US1 scenario 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A `demo-reset` command MUST create a new demo hospital, move the demo account to it
  (new active admin membership, previous memberships inactive) and load the demo data into it.
- **FR-002**: The reset MUST NOT update or delete ledger lines, stock documents, audit entries,
  case events or NDPS register rows.
- **FR-003**: An interrupted reset MUST resume into the same hospital when run again.
- **FR-004**: Defects found in the rehearsal MUST be fixed with a test where the fix is testable.
- **FR-005**: The root, backend and frontend READMEs MUST describe setup, environment variables,
  migrations, demo account and data commands, running, testing and the five flows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A presenter can restore a fresh demo in one command, in under 3 minutes.
- **SC-002**: The rehearsal checklist passes with zero console errors.
- **SC-003**: A reviewer reaches the dashboard by following only the READMEs.

## Assumptions

- Old demo hospitals stay in the database; they are not visible to the demo account.
- One demo account, as in D-018.
