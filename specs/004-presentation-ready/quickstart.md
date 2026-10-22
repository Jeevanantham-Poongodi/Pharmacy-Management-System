# Quickstart: rehearsal checklist (004)

Run `python scripts/bootstrap.py demo-reset` first, then sign in as the demo account.

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Dashboard | Tour, near-expiry cards, open cases per flow, quarantine totals |
| 2 | Tour 1: procurement at "QC passed?" → Pass → Continue | Case closed; stock page shows the IV fluid batches in Central Store |
| 3 | Procurement → New requisition (non-formulary item) → reject at committee with reason | Ends at "Requisition closed" |
| 4 | Procurement → New → Emergency local purchase → approve retrospectively with batch and expiry | Stock in Central Store |
| 5 | Tour 2: ICU indent → approve partially → Yes → Continue → Yes → … → return accepted | Earliest-expiry batch issued; ward and pharmacy balances change |
| 6 | Ward indent → New (more than the pharmacy holds) → approve → No | Linked Flow 1 case opens; "Stock received" refused while central store is short, then works |
| 7 | Tour 3: OP-1090 → verify → dispense → OP → counsel → returned (rejected) | Linked Flow 4 case at "Expired: quarantine" |
| 8 | Dispensing → New IP order for Morphine → NDPS sign-off → dispense → IP path | NDPS step shown; pharmacy stock falls |
| 9 | Tour 4: write-off → Rejected (reason) → Resubmit → Approved → Dispose | Expiry quarantine empties |
| 10 | Expiry → Run daily expiry scan twice | Second run creates nothing |
| 11 | Tour 5: recall OND-1188 → Yes → inform → return to vendor | Trace lists IP-2311; recall quarantine empties |
| 12 | Recall → New (any batch) | Holdings listed, then quarantined |
| 13 | Items: create, search, deactivate with reason, reactivate | Toasts; inactive chip |
| 14 | Console | No errors |
