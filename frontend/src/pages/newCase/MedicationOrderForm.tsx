import { useEffect, useState } from 'react'
import { FormControlLabel, Radio, RadioGroup, TextField } from '@mui/material'
import { useReference } from '../../state/referenceContext'
import { LinesEditor } from './LinesEditor'
import { EMPTY_LINE, validLines, type DraftLine } from './lines'
import type { FormProps } from './NewCaseDialog'

// F3:"Doctor writes medication order, IP or OP". Patient reference only (constitution X); the
// demo uses fictional references.
export function MedicationOrderForm({ onChange }: FormProps) {
  const { items } = useReference()
  const [orderType, setOrderType] = useState('OP')
  const [patient, setPatient] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([EMPTY_LINE])

  useEffect(() => {
    const rows = validLines(lines)
    onChange(
      patient.trim() && prescriber.trim() && rows.length
        ? {
            flow: 3,
            start: 'f3_order',
            title: `${orderType} order · ${patient.trim()}`,
            data: { order_type: orderType, patient_ref: patient.trim(), prescriber: prescriber.trim() },
            lines: rows,
          }
        : null,
    )
  }, [orderType, patient, prescriber, lines, onChange])

  return (
    <>
      <RadioGroup row value={orderType} onChange={(e) => setOrderType(e.target.value)}>
        <FormControlLabel value="OP" control={<Radio />} label="Outpatient (OP)" />
        <FormControlLabel value="IP" control={<Radio />} label="Inpatient (IP)" />
      </RadioGroup>
      <TextField label="Patient reference" placeholder="e.g. OP-1042" value={patient} onChange={(e) => setPatient(e.target.value)} />
      <TextField label="Prescriber" value={prescriber} onChange={(e) => setPrescriber(e.target.value)} />
      <LinesEditor items={items} lines={lines} onChange={setLines} />
    </>
  )
}
