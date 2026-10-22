import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { App as AntApp } from 'antd'
import { actionLabel } from './actionLabel'
import { api, describeError, type CaseDetail, type FlowEdge, type Item, type Location, type Vendor } from '../api'

// One button per arrow leaving the case's current step, labelled with the diagram's outcome.
// Edges that need input (quantities, batches, a vendor…) or a reason open a dialog first.

type Props = {
  detail: CaseDetail
  targetLabel: (node: string) => string
  items: Item[]
  locations: Location[]
  vendors: Vendor[]
  onDone: (updated: CaseDetail) => void
}

const NEGATIVE = /^(No|Rejected|Fail|Declined|Drop|Short|Wrong|Order cancelled|Rejected or unclear)/

export function ActionPanel({ detail, targetLabel, items, locations, vendors, onDone }: Props) {
  const { message } = AntApp.useApp()
  const [edge, setEdge] = useState<FlowEdge | null>(null)
  const [busy, setBusy] = useState(false)

  if (detail.closed) return <Alert severity="success">This case is closed.</Alert>
  if (detail.actions.length === 0)
    return (
      <Alert severity="info">
        No outcome is available yet. The data decides this step (for example, stock is still on hand and the batch has not
        expired).
      </Alert>
    )

  async function submit(edgeToTake: FlowEdge, note?: string, input?: Record<string, unknown>) {
    setBusy(true)
    try {
      const updated = await api.takeAction(detail.id, { edge: edgeToTake.id, note: note || undefined, input })
      message.success(`Moved to: ${targetLabel(edgeToTake.to)}`)
      setEdge(null)
      onDone(updated)
    } catch (error) {
      message.error(describeError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
        {detail.actions.map((action) => (
          <Button
            key={action.id}
            variant={NEGATIVE.test(action.outcome ?? '') ? 'outlined' : 'contained'}
            color={NEGATIVE.test(action.outcome ?? '') ? 'inherit' : 'primary'}
            disableElevation
            disabled={busy}
            onClick={() =>
              action.inputs.length || action.reason || action.approval ? setEdge(action) : void submit(action)
            }
          >
            {actionLabel(action, targetLabel)}
            {action.approval && ' ✓'}
          </Button>
        ))}
      </Stack>
      {edge && (
        <ActionDialog
          key={edge.id}
          edge={edge}
          detail={detail}
          targetLabel={targetLabel}
          items={items}
          locations={locations}
          vendors={vendors}
          busy={busy}
          onCancel={() => setEdge(null)}
          onSubmit={(note, input) => void submit(edge, note, input)}
        />
      )}
    </>
  )
}

type LineValues = Record<string, string>
type BatchValues = Record<string, { batch_no: string; expiry_date: string }>

function ActionDialog({
  edge,
  detail,
  targetLabel,
  items,
  locations,
  vendors,
  busy,
  onCancel,
  onSubmit,
}: Omit<Props, 'onDone'> & {
  edge: FlowEdge
  busy: boolean
  onCancel: () => void
  onSubmit: (note: string, input: Record<string, unknown> | undefined) => void
}) {
  const lines = detail.lines
  const [note, setNote] = useState('')
  const [qty, setQty] = useState<LineValues>(() =>
    Object.fromEntries(lines.map((l) => [l.id, edge.inputs.includes('return_qty') ? '' : String(Number(l.qty_requested))])),
  )
  const [batches, setBatches] = useState<BatchValues>(() =>
    Object.fromEntries(lines.map((l) => [l.id, { batch_no: '', expiry_date: '' }])),
  )
  const [vendorId, setVendorId] = useState<string>(String(detail.data.vendor_id ?? ''))
  const [choice, setChoice] = useState('')
  const [target, setTarget] = useState('')

  const needs = (name: string) => edge.inputs.includes(name)
  const wards = locations.filter((l) => ['ward', 'ot', 'icu'].includes(l.kind))

  // Blank quantity fields are left out rather than sent as empty strings.
  const entered = Object.fromEntries(Object.entries(qty).filter(([, v]) => v.trim() !== ''))
  // Quantity already issued or dispensed per line, for the return dialog.
  const issued = (lineId: number) =>
    ((detail.data.issued as Record<string, { qty: string }[]> | undefined)?.[lineId] ?? []).reduce(
      (sum, pick) => sum + Number(pick.qty),
      0,
    )

  function build(): Record<string, unknown> | undefined {
    const input: Record<string, unknown> = {}
    if (needs('approved_qty')) input.approved_qty = entered
    if (needs('return_qty')) input.return_qty = entered
    if (needs('order_lines')) input.order_lines = entered
    if (needs('batches')) input.batches = batches
    if (needs('vendor')) input.vendor_id = vendorId ? Number(vendorId) : undefined
    if (needs('substitute'))
      input.substitute =
        choice === 'substitute'
          ? { choice, item_id: Number(target) }
          : { choice, vendor_id: vendorId ? Number(vendorId) : undefined }
    if (needs('move_choice')) input.move_choice = choice === 'ward' ? { choice, location_id: Number(target) } : { choice }
    if (needs('signoffs')) input.signoffs = {}
    return Object.keys(input).length ? input : undefined
  }

  const qtyLabel = needs('approved_qty') ? 'Approved' : needs('return_qty') ? 'Returned' : 'Quantity'

  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{actionLabel(edge, targetLabel)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Next step: {targetLabel(edge.to)}
          </Typography>
          {edge.approval && (
            <Alert severity="info">
              This is an approval. Outside demo mode, the person who raised the case cannot approve it.
            </Alert>
          )}

          {(needs('approved_qty') || needs('return_qty') || needs('order_lines')) &&
            lines.map((line) => (
              <TextField
                key={line.id}
                type="number"
                label={
                  needs('return_qty')
                    ? `${qtyLabel}: ${line.item_name} (issued ${issued(line.id)})`
                    : `${qtyLabel}: ${line.item_name} (requested ${Number(line.qty_requested)})`
                }
                value={qty[line.id] ?? ''}
                onChange={(e) => setQty({ ...qty, [line.id]: e.target.value })}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            ))}

          {needs('batches') &&
            lines.map((line) => (
              <Box key={line.id} sx={{ display: 'grid', gridTemplateColumns: { sm: '1fr 1fr' }, gap: 1.5 }}>
                <TextField
                  label={`Batch no. · ${line.item_name}`}
                  value={batches[line.id]?.batch_no ?? ''}
                  onChange={(e) => setBatches({ ...batches, [line.id]: { ...batches[line.id], batch_no: e.target.value } })}
                />
                <TextField
                  type="date"
                  label="Expiry date"
                  value={batches[line.id]?.expiry_date ?? ''}
                  onChange={(e) =>
                    setBatches({ ...batches, [line.id]: { ...batches[line.id], expiry_date: e.target.value } })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            ))}

          {needs('vendor') && (
            <TextField select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={String(v.id)}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {needs('substitute') && (
            <>
              <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
                <FormControlLabel value="substitute" control={<Radio />} label="Substitute with prescriber consent" />
                <FormControlLabel value="emergency_purchase" control={<Radio />} label="Emergency purchase (opens a Flow 1 case)" />
              </RadioGroup>
              {choice === 'substitute' && (
                <TextField select label="Substitute item" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {items.filter((i) => i.active).map((i) => (
                    <MenuItem key={i.id} value={String(i.id)}>
                      {i.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {choice === 'emergency_purchase' && (
                <TextField select label="Vendor (optional)" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </>
          )}

          {needs('move_choice') && (
            <>
              <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
                <FormControlLabel value="ward" control={<Radio />} label="Move to a high-use ward" />
                <FormControlLabel value="vendor" control={<Radio />} label="Offer return to vendor" />
              </RadioGroup>
              {choice === 'ward' && (
                <TextField select label="Ward, OT or ICU" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {wards.map((w) => (
                    <MenuItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </>
          )}

          {needs('signoffs') && (
            <Alert severity="warning">
              NDPS register entry for patient {String(detail.data.patient_ref ?? '')}. You sign as the first signatory; in
              demo mode you also give the second sign-off. Outside demo mode a second, different user must sign.
            </Alert>
          )}

          <TextField
            label={edge.reason ? 'Reason (required)' : 'Note (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
            required={edge.reason}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disableElevation
          disabled={busy || (edge.reason && !note.trim())}
          onClick={() => onSubmit(note.trim(), build())}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}
