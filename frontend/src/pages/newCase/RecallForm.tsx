import { useEffect, useState } from 'react'
import { FormControlLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { api, type Batch } from '../../api'
import type { FormProps } from './NewCaseDialog'

// F5:"Recall notice from regulator or vendor"
export function RecallForm({ onChange }: FormProps) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [batchId, setBatchId] = useState('')
  const [source, setSource] = useState('regulator')

  useEffect(() => {
    void api.batches().then((all) => setBatches(all.filter((b) => !b.blocked)))
  }, [])

  useEffect(() => {
    const batch = batches.find((b) => String(b.id) === batchId)
    onChange(
      batch
        ? {
            flow: 5,
            start: 'f5_notice',
            title: `Recall ${batch.item_name} batch ${batch.batch_no}`,
            data: { batch_id: batch.id, source },
            lines: [{ item_id: batch.item_id, qty: 1, batch_id: batch.id }],
          }
        : null,
    )
  }, [batchId, source, batches, onChange])

  return (
    <>
      <RadioGroup row value={source} onChange={(e) => setSource(e.target.value)}>
        <FormControlLabel value="regulator" control={<Radio />} label="Notice from regulator" />
        <FormControlLabel value="vendor" control={<Radio />} label="Notice from vendor" />
      </RadioGroup>
      <TextField select label="Batch named in the notice" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
        {batches.map((b) => (
          <MenuItem key={b.id} value={String(b.id)}>
            {b.item_name} · {b.batch_no} · exp {b.expiry_date}
          </MenuItem>
        ))}
      </TextField>
    </>
  )
}
