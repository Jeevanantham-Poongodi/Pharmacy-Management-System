import { useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { App as AntApp } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api, describeError, type ControlledClass, type FormularyStatus, type Item, type ItemInput } from '../api'
import { useAsync } from '../hooks/useAsync'
import { label, labelsOf } from '../labels'

// Item master (feature 001 FR-010, FR-014, FR-015): create, search, and deactivate or reactivate
// with a recorded reason. Items are never deleted.

const EMPTY: ItemInput = { name: '', base_unit: '', formulary_status: 'formulary', controlled_class: 'none' }

export function Items({ canWrite }: { canWrite: boolean }) {
  const { message } = AntApp.useApp()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const list = useAsync(() => api.listItems(query || undefined), `items-${query}`)
  const items = list.data ?? list.previous
  const [form, setForm] = useState<ItemInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<Item | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const item = await api.createItem({ ...form, name: form.name.trim(), base_unit: form.base_unit.trim() })
      message.success(`Saved “${item.name}”`)
      setForm(EMPTY)
      list.reload()
    } catch (error) {
      message.error(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Items
      </Typography>

      {canWrite && (
        <Paper variant="outlined" component="form" onSubmit={create} aria-label="New item" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            New item
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr', lg: '2fr 1fr 1fr 1fr auto' }, alignItems: 'start' }}>
            <TextField
              size="small"
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              size="small"
              label="Base unit"
              required
              placeholder="tablet, vial, ml…"
              value={form.base_unit}
              onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              select
              size="small"
              label="Formulary status"
              value={form.formulary_status}
              onChange={(e) => setForm({ ...form, formulary_status: e.target.value as FormularyStatus })}
            >
              {labelsOf('formulary_status').map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Narcotic / Schedule X"
              value={form.controlled_class}
              onChange={(e) => setForm({ ...form, controlled_class: e.target.value as ControlledClass })}
            >
              {labelsOf('controlled_class').map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" disableElevation disabled={saving}>
              {saving ? 'Saving…' : 'Save item'}
            </Button>
          </Box>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          component="form"
          direction="row"
          spacing={1}
          sx={{ mb: 2 }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            setQuery(search.trim())
          }}
        >
          <TextField size="small" label="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260 }} />
          <Button type="submit" variant="outlined" startIcon={<SearchOutlined />}>
            Search
          </Button>
        </Stack>
        {list.error ? (
          <Typography color="error">{list.error}</Typography>
        ) : items === null ? (
          <LinearProgress />
        ) : items.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>No items found.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Base unit</TableCell>
                  <TableCell>Formulary</TableCell>
                  <TableCell>Narcotic / Schedule X</TableCell>
                  <TableCell>Status</TableCell>
                  {canWrite && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} sx={{ opacity: item.active ? 1 : 0.6 }}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.base_unit}</TableCell>
                    <TableCell>{label('formulary_status', item.formulary_status)}</TableCell>
                    <TableCell>
                      {item.controlled_class === 'none' ? (
                        label('controlled_class', item.controlled_class)
                      ) : (
                        <Chip size="small" color="error" variant="outlined" label={label('controlled_class', item.controlled_class)} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.active ? 'Active' : 'Inactive'} color={item.active ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    {canWrite && (
                      <TableCell align="right">
                        <Button size="small" onClick={() => setToggling(item)}>
                          {item.active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {toggling && (
        <ReasonDialog
          item={toggling}
          onClose={() => setToggling(null)}
          onDone={(changed) => {
            message.success(`“${changed.name}” ${changed.active ? 'reactivated' : 'deactivated'}`)
            setToggling(null)
            list.reload()
          }}
        />
      )}
    </Stack>
  )
}

// Deactivating or reactivating is audited with a reason (FR-015), asked in-page.
export function ReasonDialog({ item, onClose, onDone }: { item: Item; onClose: () => void; onDone: (item: Item) => void }) {
  const { message } = AntApp.useApp()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const verb = item.active ? 'Deactivate' : 'Reactivate'

  async function confirm() {
    setBusy(true)
    try {
      onDone(await api.setItemActive(item.id, !item.active, reason.trim()))
    } catch (error) {
      message.error(describeError(error))
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {verb} “{item.name}”
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          label="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={busy || !reason.trim()} onClick={() => void confirm()}>
          {verb}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
