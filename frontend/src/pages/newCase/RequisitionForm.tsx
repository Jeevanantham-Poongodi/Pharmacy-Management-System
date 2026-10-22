import { useEffect, useState } from 'react'
import { FormControlLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { useReference } from '../../state/reference'
import { EMPTY_LINE, LinesEditor, validLines, type DraftLine } from './LinesEditor'
import type { FormProps } from './NewCaseDialog'

// Flow 1 has two starts: F1:"Stock below reorder level or department need" and
// F1:"Emergency local purchase".
export function RequisitionForm({ onChange }: FormProps) {
  const { items, vendors } = useReference()
  const [start, setStart] = useState('f1_need')
  const [trigger, setTrigger] = useState('reorder_level')
  const [vendorId, setVendorId] = useState('')
  const [title, setTitle] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE])

  useEffect(() => {
    const rows = validLines(lines)
    const ready = rows.length > 0 && (start === 'f1_need' || vendorId)
    onChange(
      ready
        ? {
            flow: 1,
            start,
            title: title.trim() || (start === 'f1_need' ? 'Purchase requisition' : 'Emergency local purchase'),
            data: start === 'f1_need' ? { trigger } : { vendor_id: Number(vendorId) },
            lines: rows,
          }
        : null,
    )
  }, [start, trigger, vendorId, title, lines, onChange])

  return (
    <>
      <RadioGroup row value={start} onChange={(e) => setStart(e.target.value)}>
        <FormControlLabel value="f1_need" control={<Radio />} label="Requisition" />
        <FormControlLabel value="f1_emergency" control={<Radio />} label="Emergency local purchase" />
      </RadioGroup>
      {start === 'f1_need' ? (
        <TextField select label="Trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <MenuItem value="reorder_level">Stock below reorder level</MenuItem>
          <MenuItem value="department_need">Department need</MenuItem>
        </TextField>
      ) : (
        <TextField select label="Vendor bought from" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          {vendors.map((v) => (
            <MenuItem key={v.id} value={String(v.id)}>
              {v.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <LinesEditor items={items} lines={lines} onChange={setLines} />
    </>
  )
}
