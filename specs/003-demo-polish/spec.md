# Feature Specification: Demo Polish

**Feature Branch**: `003-demo-polish` (created by hand per D-008)

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Demo polish: restyle the Items page to match the new screens, show
readable names instead of IDs and codes, add a guided demo tour on the dashboard, and tidy the
lint warnings."

## Sources and Scope

Presentation-only follow-up to feature 002 under D-018 (demo scope). No business rule, flow,
data or API changes; the flow diagram (D-010) and the Branch Inventory of feature 002 are
unchanged. The tour only links to existing screens and steps.

**Out of scope**: new flows or flow steps, role-based accounts, audit and stock-take screens,
backend changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A presenter follows a guided tour of the five flows (Priority: P1)

A presenter opens the dashboard and sees a short, numbered tour: one step per flow, each saying
what to show and linking straight to a demo case at the right step. The presenter can hide the
tour and bring it back.

**Why this priority**: the demo audience sees all five flows without the presenter hunting for
cases.

**Independent Test**: with demo data loaded, open the dashboard, follow each tour link, and land
on a list or case where the described outcome is available.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** it loads, **Then** a tour lists one step per flow in diagram
   order (1–5), each with a link to that flow's cases filtered to the step named in the tour.
2. **Given** the tour is hidden, **When** the presenter reloads the dashboard, **Then** it stays
   hidden until "Show demo tour" is chosen.
3. **Given** a tour step whose filtered list is empty (the case has already moved on), **When**
   the link is followed, **Then** the list says so and offers "Show all".

---

### User Story 2 - The item master looks like the rest of the application (Priority: P2)

The Items page uses the same layout, fields, tables and dialogs as the flow screens.
Deactivating or reactivating an item asks for the reason in an in-page dialog instead of a
browser prompt.

**Why this priority**: the old styling and browser prompt break the demo's look and block
automation.

**Independent Test**: create an item, search for it, deactivate it with a reason in the dialog
and reactivate it; all actions succeed and messages appear as toasts.

**Acceptance Scenarios**:

1. **Given** the Items page, **When** an item is created, **Then** it appears in the list and a
   success toast is shown; a duplicate name shows the server's conflict message.
2. **Given** an item, **When** Deactivate is chosen, **Then** a dialog asks for the reason; the
   change is saved only on Confirm, and Cancel changes nothing.
3. **Given** inactive items, **When** the list is shown, **Then** they are visibly marked
   inactive.

---

### User Story 3 - Values read as words, not codes (Priority: P2)

Wherever the screens show stored codes (trigger, notice source, chosen action, order type,
location kind, controlled class, formulary status), they show a readable label instead.

**Why this priority**: an audience should never see `department_need` or `quarantine_expiry`.

**Independent Test**: open a requisition, an expiry case and a recall case; no underscore-style
code appears anywhere on the page.

**Acceptance Scenarios**:

1. **Given** a requisition raised for a department need, **When** its case page opens, **Then**
   the trigger reads "Department need".
2. **Given** the stock page, **When** quarantine stock is listed, **Then** the location is
   marked with a readable quarantine label.

---

### User Story 4 - Clean lint (Priority: P3)

The frontend lint run reports no warnings.

**Independent Test**: `npm run lint` prints zero warnings and zero errors.

### Edge Cases

- The demo data may not be loaded: the tour still shows, and each link opens a flow list that
  explains it is empty.
- Browser storage unavailable (private window): the tour shows and can be hidden for the
  session; nothing breaks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST show a dismissible demo tour with one step per flow (1–5), each
  naming the diagram step to demonstrate and linking to that flow's cases filtered to it.
- **FR-002**: The tour's hidden or shown state MUST be remembered per browser.
- **FR-003**: A filtered case list with no cases MUST say so and offer to show all cases.
- **FR-004**: The Items page MUST use the shared look (MUI fields, tables, dialogs; Ant Design
  toasts) and ask for the activate/deactivate reason in an in-page dialog.
- **FR-005**: The screens MUST show readable labels for every stored code listed in User
  Story 3.
- **FR-006**: `npm run lint` MUST report no warnings or errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A presenter can reach a demonstrable step in each of the five flows from the
  dashboard in one click per flow.
- **SC-002**: No screen shows an underscore-style code.
- **SC-003**: No browser dialog (alert, confirm, prompt) is used anywhere in the application.
- **SC-004**: Lint reports 0 warnings; all existing tests still pass.

## Assumptions

- The tour's steps point at nodes where the demo data (feature 002, T049) leaves cases waiting.
- The item master's rules (feature 001 FR-010, FR-014, FR-015) are unchanged.
