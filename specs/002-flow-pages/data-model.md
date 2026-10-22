# Data Model: Flow Pages (002)

All tables are in `public`, carry `hospital_id` (D-006), have RLS enabled, and are readable by
members of the hospital (`hospital_id in (select app.current_hospital_ids())`). Writes go through
the API as the `authenticated` role; grants are listed per table. Names reuse Foundation's data
model where it exists.

## Masters

### locations
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint identity PK | |
| hospital_id | bigint FK hospitals | |
| code | text | unique per hospital |
| name | text | not blank |
| kind | text | `central_store`, `pharmacy`, `ward`, `ot`, `icu`, `quarantine_qc`, `quarantine_expiry`, `quarantine_recall` |
| allocatable | boolean | false for every `quarantine_*` kind (check constraint) — Principle III |

### vendors
id, hospital_id, name (unique per hospital), active.

### batches
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint identity PK | |
| hospital_id, item_id | FK | |
| batch_no | text | unique per (hospital, item) |
| expiry_date | date | |
| vendor_id | FK vendors, nullable | |
| blocked | boolean default false | set by `F5:"Block and quarantine batches"`; never allocated |
| first_receipt_at | timestamptz | set at first receipt; FEFO tie-break (D-005 step 2) |

Grants: select, insert, update (blocked, first_receipt_at only by domain code).

### hospital_settings
hospital_id, key, value jsonb; PK (hospital_id, key). Seeded: `expiry.alert_windows_days` =
`[90, 60, 30]` (`F4:"Within 90, 60 or 30 days?"`) and `allocation.block_on_expiry_date` = `true`
(D-012 temporary rule: a batch is not allocatable on or after its expiry date; `false` would
allow it on the expiry date itself).

## Stock

### stock_documents (append-only)
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint identity PK | |
| hospital_id | FK | |
| doc_type | text | `opening`, `receipt`, `transfer`, `issue`, `dispense`, `return`, `return_to_vendor`, `write_off` |
| case_id | FK flow_cases, nullable | the case whose move posted it |
| patient_ref, prescriber | text, nullable | dispense only (fictional in demo) |
| note | text | |
| posted_by | uuid default `auth.uid()` | |
| posted_at | timestamptz default now() | |

### ledger_lines (append-only)
id, hospital_id, document_id, item_id, batch_id, location_id, qty numeric(12,2) (signed, ≠ 0),
posted_at. Trigger `after insert` → upsert `stock_balances`. Update/delete blocked by
`app.forbid_update_delete()`.

### stock_balances
PK (hospital_id, batch_id, location_id); item_id; qty numeric(12,2) **check (qty >= 0)**.
Written only by the ledger trigger (security definer); read-only to `authenticated`.

## Cases

### flow_cases
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint identity PK | |
| hospital_id | FK | |
| flow | smallint | 1–5 |
| node | text | a node key of that flow (validated in domain code against definitions) |
| title | text | |
| data | jsonb | flow details: `ward_location_id`, `vendor_id`, `patient_ref`, `prescriber`, `order_type` (IP/OP), `batch_id` (recall/expiry), `location_id`, `window_days`, `trigger`, `choice` |
| parent_case_id | FK flow_cases, nullable | linked cases (FR-021, FR-021a, FR-022, F3 emergency purchase) |
| closed | boolean | true at an end node |
| raised_by | uuid default `auth.uid()` | |
| created_at, updated_at | timestamptz | |

### flow_case_lines
id, hospital_id, case_id, item_id, batch_id (nullable until known), location_id (nullable),
qty_requested, qty_approved (nullable). Updated by moves that approve partial quantities or
record batch details at the GRN check.

### flow_events (append-only)
id, hospital_id, case_id, from_node, outcome (diagram label or null), to_node, actor
(default `auth.uid()`), note, input jsonb, created_at.

### ndps_register (append-only)
id, hospital_id, case_id, item_id, batch_id, qty, patient_ref, signoff_1, signoff_2,
created_at. Check `signoff_1 <> signoff_2` is **not** a DB constraint (D-018); enforced in domain
code when demo mode is off.

## Permissions (seeded in 0002)

`flows.read`, `flows.write`, `flows.approve`, `stock.read`, `masters.read`. Granted to the
`admin` role of every existing hospital.

## State transitions

The node and edge lists are the spec's Branch Inventory, encoded in
`backend/app/flows/definitions.py`. Each edge carries:

| Option | Meaning |
| --- | --- |
| `approval` | FR-004 check applies |
| `reason` | note required (FR-005) |
| `guard` | data-driven availability (research R2) |
| `effect` | stock effect name (FR-020–FR-025) |
| `inputs` | fields asked when taking the edge (e.g. batch no + expiry at GRN, ward for a move) |
