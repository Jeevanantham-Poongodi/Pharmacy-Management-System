import { useEffect, useMemo, useState } from 'react'
import { MenuItem, TextField } from '@mui/material'
import { useReference } from '../../state/reference'
import { EMPTY_LINE, LinesEditor, validLines, type DraftLine } from './LinesEditor'
import type { FormProps } from './NewCaseDialog'

// F2:"Ward, OT or ICU needs stock"
export function IndentForm({ onChange }: FormProps) {
  const { items, locations } = useReference()
  const wards = useMemo(() => locations.filter((l) => ['ward', 'ot', 'icu'].includes(l.kind)), [locations])
  const [ward, setWard] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE])

  useEffect(() => {
    const rows = validLines(lines)
    const name = wards.find((w) => String(w.id) === ward)?.name
    onChange(
      ward && rows.length
        ? { flow: 2, start: 'f2_need', title: `Indent from ${name}`, data: { ward_location_id: Number(ward) }, lines: rows }
        : null,
    )
  }, [ward, lines, wards, onChange])

  return (
    <>
      <TextField select label="Ward, OT or ICU" value={ward} onChange={(e) => setWard(e.target.value)}>
        {wards.map((w) => (
          <MenuItem key={w.id} value={String(w.id)}>
            {w.name}
          </MenuItem>
        ))}
      </TextField>
      <LinesEditor items={items} lines={lines} onChange={setLines} />
    </>
  )
}
