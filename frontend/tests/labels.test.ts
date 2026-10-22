import { describe, expect, it } from 'vitest'
import { label, labelsOf, type LabelGroup } from '../src/labels'

const GROUPS: LabelGroup[] = ['trigger', 'source', 'choice', 'order_type', 'location_kind', 'controlled_class', 'formulary_status']

describe('readable labels (feature 003, FR-005)', () => {
  it('has a label without underscores for every stored code', () => {
    for (const group of GROUPS) {
      for (const [code, text] of labelsOf(group)) {
        expect(text, `${group}.${code}`).not.toMatch(/_/)
        expect(label(group, code)).toBe(text)
      }
    }
  })

  it('covers every location kind the backend allows', () => {
    const kinds = labelsOf('location_kind').map(([code]) => code)
    expect(kinds.sort()).toEqual(
      ['central_store', 'pharmacy', 'ward', 'ot', 'icu', 'quarantine_qc', 'quarantine_expiry', 'quarantine_recall'].sort(),
    )
  })

  it('falls back to words for an unknown code', () => {
    expect(label('trigger', 'stock_count_variance')).toBe('Stock count variance')
  })
})
