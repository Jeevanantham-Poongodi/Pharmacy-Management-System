import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { api, describeError, type Balance } from '../api'
import { ExpiryChip } from '../components/ExpiryChip'
import { useReference } from '../state/reference'

// Balance per location, item and batch (FR-031). Balances are the sum of posted ledger lines.
export function Stock() {
  const { locations } = useReference()
  const [locationId, setLocationId] = useState('')
  const [rows, setRows] = useState<Balance[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.balances({ location_id: locationId ? Number(locationId) : undefined }).then(setRows, (e) => setError(describeError(e)))
  }, [locationId])

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Stock
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField select size="small" label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} sx={{ minWidth: 260, mb: 2 }}>
          <MenuItem value="">All locations</MenuItem>
          {locations.map((l) => (
            <MenuItem key={l.id} value={String(l.id)}>
              {l.name}
              {!l.allocatable && ' (quarantine)'}
            </MenuItem>
          ))}
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
        {rows === null ? (
          <LinearProgress />
        ) : rows.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>No stock here.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Location</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Batch</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.location_id}-${r.batch_id}`}>
                    <TableCell>
                      {r.location_name}
                      {r.location_kind.startsWith('quarantine') && <Chip size="small" label="quarantine" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{r.item_name}</TableCell>
                    <TableCell>
                      {r.batch_no}
                      {r.blocked && <Chip size="small" color="error" label="recalled" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>
                      <ExpiryChip date={r.expiry_date} />
                    </TableCell>
                    <TableCell align="right">{Number(r.qty)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
