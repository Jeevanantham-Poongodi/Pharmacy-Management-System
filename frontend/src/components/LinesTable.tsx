import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import type { CaseLine } from '../api'
import { ExpiryChip } from './ExpiryChip'

export function LinesTable({ lines }: { lines: CaseLine[] }) {
  if (lines.length === 0) return null
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Item</TableCell>
          <TableCell align="right">Requested</TableCell>
          <TableCell align="right">Approved</TableCell>
          <TableCell>Batch</TableCell>
          <TableCell>Expiry</TableCell>
          <TableCell>Location</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell>{line.item_name}</TableCell>
            <TableCell align="right">{Number(line.qty_requested)}</TableCell>
            <TableCell align="right">{line.qty_approved === null ? '—' : Number(line.qty_approved)}</TableCell>
            <TableCell>{line.batch_no ?? '—'}</TableCell>
            <TableCell>{line.expiry_date ? <ExpiryChip date={line.expiry_date} /> : '—'}</TableCell>
            <TableCell>{line.location_name ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
