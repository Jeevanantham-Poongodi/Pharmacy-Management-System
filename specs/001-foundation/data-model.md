# Data Model: Foundation (001)

Postgres (Supabase). Names are snake_case; tables are plural. Every business table has
`hospital_id` (D-006), RLS enabled, and a policy limiting rows to hospitals the current user is an
active member of (research R4). Timestamps are `timestamptz`, set by the server. IDs are
`bigint` identity unless stated. All quantities are in the item's base unit and are positive
integers unless stated.

## Tenancy, users and access

### hospitals
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK |
| name | text | required |
| time_zone | text | required, seed `Asia/Kolkata` |
| active | boolean | default true |

### hospital_members
Links a sign-in account (`auth.users.id`) to a hospital.
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id | bigint | FK hospitals |
| user_id | uuid | FK `auth.users(id)` |
| display_name | text | required |
| active | boolean | default true; deactivation blocks all access (US1 scenario 4) |
| created_by | uuid | administrator who created the account |
| PK | | (hospital_id, user_id) |

### roles
Seeded with the diagram's actors plus administrator (FR-004): `store`, `drug_committee`, `hod`,
`finance`, `ward`, `pharmacist`, `prescriber`, `nurse`, `qc`, `audit`, `admin`.
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id | bigint | |
| code | text | unique per hospital |
| name | text | |
| privileged | boolean | MFA required when true (FR-008); configuration |

### permissions
Fixed list of actions the system checks (for example `items.write`, `stock_documents.approve`,
`audit.read`). Not hospital-specific.

### role_permissions
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id, role_code, permission_code | | PK; configuration set by the administrator (OI-6). Only `admin` is seeded with permissions. |

### user_roles / user_locations
| Table | Columns | Rules |
| --- | --- | --- |
| user_roles | hospital_id, user_id, role_code | PK on all three |
| user_locations | hospital_id, user_id, location_id | PK on all three |

## Master data

### items
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK |
| hospital_id | bigint | |
| name | text | required |
| base_unit | text | required (for example `tablet`, `vial`) |
| formulary_status | text | `formulary` or `non_formulary` (`F1:"Formulary item?"`) |
| controlled_class | text | `none`, `narcotic`, `schedule_x` (`F3:"Narcotic or Schedule X?"`) |
| active | boolean | default true |
| Unique | | (hospital_id, lower(name)) |

### batches
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK; also the third FEFO tie-break (D-005) |
| hospital_id, item_id | bigint | FK items |
| batch_number | text | required |
| expiry_date | date | required |
| first_receipt_posted_at | timestamptz | null until the first receipt or opening-stock document for this batch posts; second FEFO key (D-005) |
| active | boolean | |
| Unique | | (hospital_id, item_id, batch_number) (FR-011) |

### locations
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK |
| hospital_id | bigint | |
| name | text | unique per hospital |
| type | text | `central_store`, `pharmacy`, `ward`, `ot`, `icu`, `qc`, `quarantine` (FR-012) |
| allocatable | boolean | generated: false when type is `qc` or `quarantine` |
| active | boolean | |

### vendors
| Column | Type | Rules |
| --- | --- | --- |
| id, hospital_id | bigint | |
| name | text | unique per hospital |
| active | boolean | |

### item_location_settings
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id, item_id, location_id | | PK |
| reorder_level | integer | ≥ 0 (`F1:"Stock below reorder level or department need"`); changes recorded in `setting_history` |

**Deletion rule** (FR-015): items, batches, locations and vendors have no DELETE grant; a
`BEFORE DELETE` trigger refuses deletion when ledger lines reference the row. Deactivation is an
UPDATE of `active`.

## Stock

### stock_documents
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK |
| hospital_id | bigint | |
| doc_number | text | unique per hospital; generated |
| type | text | `receipt`, `issue`, `transfer`, `return`, `adjustment`, `write_off`, `opening_stock`, `reversal` (FR-020) |
| status | text | see state machine below |
| reason | text | required for `adjustment`, `write_off`, `return`, `reversal` |
| reverses_document_id | bigint | FK stock_documents; required for `reversal`; unique (a document is reversed once, FR-023) |
| raised_by | uuid | |
| posted_by | uuid | null until posted |
| posted_at | timestamptz | null until posted |
| idempotency_key | text | unique per (hospital_id, raised_by, idempotency_key) — second guard (R8) |
| source_ref | jsonb | reference to the calling feature's record (later features); null in 001 |

**State machine** (only what this feature needs):

```text
draft ──submit──▶ submitted ──approve (different user)──▶ posted
                     │
                     └─reject (different user, reason)──▶ rejected ──revise──▶ draft
```

- `opening_stock`, `adjustment` (from a stock count) and `reversal` require approval (D-017,
  FR-072, FR-023). Other types are posted by later features through the posting service.
- A `posted` row cannot be changed (trigger, R6). A reversal cannot itself be reversed.

### stock_document_lines
| Column | Type | Rules |
| --- | --- | --- |
| id, document_id | bigint | |
| item_id, batch_id | bigint | batch must belong to the item |
| from_location_id | bigint | null for receipts and opening stock |
| to_location_id | bigint | null for issues and write-offs |
| quantity | integer | > 0 |

### ledger_lines (append-only)
| Column | Type | Rules |
| --- | --- | --- |
| id | bigint | PK |
| hospital_id, document_id | bigint | |
| item_id, batch_id, location_id | bigint | |
| quantity_delta | integer | non-zero; negative = out, positive = in |
| posted_by | uuid | |
| posted_at | timestamptz | server time |
| doc_type, reason | text | copied from the document (FR-021) |

No UPDATE/DELETE grants; trigger refuses UPDATE/DELETE (R6).

### stock_balances
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id, item_id, batch_id, location_id | | PK |
| quantity | integer | `CHECK (quantity >= 0)` (FR-025) |

Changed only by the posting service in the same transaction as the ledger lines. The drift
check (FR-027) compares it with `SUM(quantity_delta)` per key.

## Approvals and idempotency

### approvals (append-only)
| Column | Type | Rules |
| --- | --- | --- |
| id, hospital_id | bigint | |
| subject_type | text | `stock_document` or `stock_count` |
| subject_id | bigint | |
| decision | text | `approved` or `rejected` |
| decided_by | uuid | MUST differ from the subject's `raised_by` (FR-041; checked in the domain layer and by a CHECK trigger) |
| reason | text | required for `rejected` |
| decided_at | timestamptz | |

### approval_rules
| Column | Type | Rules |
| --- | --- | --- |
| hospital_id, subject_type, doc_type | | PK |
| approver_role_code | text | configuration (FR-043, OI-7) |

### idempotency_keys
See research R8. PK `(hospital_id, user_id, operation, key)`; `request_hash`,
`response_status`, `response_body`, `created_at`.

## Audit and configuration

### audit_entries (append-only, hash-chained)
| Column | Type | Rules |
| --- | --- | --- |
| id, hospital_id | bigint | |
| actor_user_id | uuid | null only for system jobs, which set `system_job` |
| system_job | text | for example `user_provisioning`, `ledger_drift_check` |
| action | text | `create`, `update`, `approve`, `reject`, `reverse`, `sign_in`, `access_denied`, `export`, … |
| entity_type, entity_id | text | |
| before, after | jsonb | changes only; no secrets or tokens (FR-053) |
| reason | text | |
| request_id | text | |
| created_at | timestamptz | |
| prev_hash, entry_hash | text | SHA-256 chain per hospital (R6) |

Read access: only users whose role has `audit.read` (FR-052).

### settings and setting_history
| Table | Columns | Rules |
| --- | --- | --- |
| settings | hospital_id, key, value (jsonb), updated_by, updated_at | PK (hospital_id, key) |
| setting_history | hospital_id, key, value, valid_from, changed_by, reason | append-only; "value on date D" = latest row with `valid_from <= D` (FR-061) |

Seed keys (values are seed defaults, not hard-coded rules):

| Key | Seed | Source |
| --- | --- | --- |
| `expiry.alert_windows_days` | `[90, 60, 30]` | `F4:"Within 90, 60 or 30 days?"` |
| `allocation.block_on_expiry_date` | `true` | D-012 temporary rule |
| `auth.privileged_role_codes` | `["admin","audit","finance"]` plus any role holding an approve permission | FR-008 |
| `idempotency.key_retention_days` | set by the hospital before go-live; no number invented | R8 |
| `idempotency.lock_timeout_ms` | set by the hospital before go-live | R8 |
| `ledger.drift_check_schedule` | set by the hospital before go-live | FR-027 |

The application refuses to start a posting if a required setting has no value, and reports
which one is missing.

## Stock take (D-007)

### stock_counts
| Column | Type | Rules |
| --- | --- | --- |
| id, hospital_id, location_id | bigint | |
| status | text | `open` → `submitted` → `approved` (posts one adjustment) or `rejected` → `open` |
| raised_by | uuid | |
| snapshot_at | timestamptz | |
| adjustment_document_id | bigint | set when approved |

### stock_count_lines
| Column | Type | Rules |
| --- | --- | --- |
| count_id, item_id, batch_id | | PK |
| snapshot_quantity | integer | frozen at start (FR-070) |
| counted_quantity | integer | ≥ 0, null until entered |
| variance | integer | generated: counted − snapshot |

## RLS summary

| Table group | `authenticated` SELECT | `authenticated` INSERT/UPDATE | DELETE |
| --- | --- | --- | --- |
| Master data, settings | member of hospital | member of hospital (backend also checks permission) | none |
| Stock documents and lines | member of hospital | member of hospital; UPDATE only while not posted | none |
| ledger_lines, approvals, setting_history | member of hospital | INSERT only | none |
| audit_entries | member with `audit.read` | INSERT only | none |
| idempotency_keys | own rows | own rows | system job only |
