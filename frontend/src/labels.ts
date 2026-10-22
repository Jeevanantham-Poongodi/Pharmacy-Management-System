// Readable labels for codes stored by the backend, so no screen shows `department_need` or
// `quarantine_expiry` (feature 003, FR-005).

const LABELS = {
  trigger: { reorder_level: 'Stock below reorder level', department_need: 'Department need' },
  source: { regulator: 'Regulator', vendor: 'Vendor' },
  choice: { ward: 'Moved to a high-use ward', vendor: 'Offered return to vendor' },
  order_type: { IP: 'Inpatient (IP)', OP: 'Outpatient (OP)' },
  location_kind: {
    central_store: 'Central store',
    pharmacy: 'Pharmacy',
    ward: 'Ward',
    ot: 'Operation theatre',
    icu: 'ICU',
    quarantine_qc: 'QC quarantine',
    quarantine_expiry: 'Expiry quarantine',
    quarantine_recall: 'Recall quarantine',
  },
  controlled_class: { none: 'None', narcotic: 'Narcotic', schedule_x: 'Schedule X' },
  formulary_status: { formulary: 'Formulary', non_formulary: 'Non-formulary' },
} as const

export type LabelGroup = keyof typeof LABELS

export function label(group: LabelGroup, code: unknown): string {
  const text = String(code ?? '')
  const known = (LABELS[group] as Record<string, string>)[text]
  if (known) return known
  const words = text.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function labelsOf(group: LabelGroup): [string, string][] {
  return Object.entries(LABELS[group])
}
