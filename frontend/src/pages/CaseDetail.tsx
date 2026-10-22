import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { Alert, Box, Breadcrumbs, Chip, LinearProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { api, describeError, type BatchTrace, type CaseDetail as Detail } from '../api'
import { ActionPanel } from '../components/ActionPanel'
import { CaseHistory } from '../components/CaseHistory'
import { FlowMap } from '../components/FlowMap'
import { LinesTable } from '../components/LinesTable'
import { FLOW_PATHS, useReference } from '../state/reference'

const DETAIL_LABELS: Record<string, string> = {
  order_type: 'Order type',
  patient_ref: 'Patient',
  prescriber: 'Prescriber',
  trigger: 'Trigger',
  window_days: 'Alert window (days)',
  source: 'Notice from',
  choice: 'Action chosen',
}

export function CaseDetail() {
  const id = Number(useParams().caseId)
  const { flow, nodeLabel, locations, vendors, items } = useReference()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trace, setTrace] = useState<BatchTrace | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setDetail(await api.getCase(id))
    } catch (e) {
      setError(describeError(e))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const batchId = detail?.flow === 5 ? Number(detail.data.batch_id) : null
  useEffect(() => {
    if (batchId) void api.batchTrace(batchId).then(setTrace, () => setTrace(null))
  }, [batchId, detail?.node])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!detail) return <LinearProgress />

  const definition = flow(detail.flow)!
  const label = (node: string) => nodeLabel(detail.flow, node)
  const locationName = (value: unknown) => locations.find((l) => l.id === Number(value))?.name
  const vendorName = vendors.find((v) => v.id === Number(detail.data.vendor_id))?.name
  const details: [string, string][] = [
    ...Object.entries(DETAIL_LABELS)
      .filter(([key]) => detail.data[key] !== undefined && detail.data[key] !== null)
      .map(([key, name]): [string, string] => [name, String(detail.data[key]).replace(/_/g, ' ')]),
    ...(detail.data.ward_location_id ? [['Ward', locationName(detail.data.ward_location_id) ?? '']] as [string, string][] : []),
    ...(detail.data.location_id ? [['Location', locationName(detail.data.location_id) ?? '']] as [string, string][] : []),
    ...(vendorName ? [['Vendor', vendorName]] as [string, string][] : []),
  ]

  return (
    <Stack spacing={2}>
      <Breadcrumbs>
        <Link component={RouterLink} to={`/flows/${FLOW_PATHS[detail.flow]}`} underline="hover">
          {definition.title}
        </Link>
        <Typography>Case #{detail.id}</Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mr: 1 }}>
          {detail.title}
        </Typography>
        <Chip label={detail.node_label} color={detail.closed ? 'default' : 'primary'} />
        {detail.parent_case_id && (
          <Chip
            variant="outlined"
            label={`From case #${detail.parent_case_id}`}
            component={RouterLink}
            to={`/cases/${detail.parent_case_id}`}
            clickable
          />
        )}
        {detail.child_case_ids.map((child) => (
          <Chip key={child} variant="outlined" color="secondary" label={`Linked case #${child}`} component={RouterLink} to={`/cases/${child}`} clickable />
        ))}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Next step
        </Typography>
        <ActionPanel
          detail={detail}
          targetLabel={label}
          items={items}
          locations={locations}
          vendors={vendors}
          onDone={setDetail}
        />
      </Paper>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { lg: '3fr 2fr' } }}>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Flow {detail.flow}: where this case is
            </Typography>
            <FlowMap flow={definition} current={detail.node} events={detail.events} />
          </Paper>
          {details.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Details
              </Typography>
              <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5, m: 0 }}>
                {details.map(([name, value]) => (
                  <Box key={name} sx={{ display: 'contents' }}>
                    <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                      {name}
                    </Typography>
                    <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
          <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Lines
            </Typography>
            <LinesTable lines={detail.lines} />
          </Paper>
          {trace && <RecallTrace trace={trace} />}
        </Stack>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            History
          </Typography>
          <CaseHistory events={detail.events} nodeLabel={label} />
        </Paper>
      </Box>
    </Stack>
  )
}

// F5:"Find affected batches in all stores and wards" and F5:"Already dispensed to patients?"
function RecallTrace({ trace }: { trace: BatchTrace }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Batch {trace.batch.batch_no} {trace.batch.blocked && <Chip size="small" color="error" label="Blocked" sx={{ ml: 1 }} />}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
        Held at
      </Typography>
      {trace.holdings.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No stock left anywhere.
        </Typography>
      ) : (
        trace.holdings.map((h) => (
          <Typography key={h.location_id} variant="body2">
            {h.location_name}: {Number(h.qty)}
          </Typography>
        ))
      )}
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 1.5 }}>
        Dispensed to patients
      </Typography>
      {trace.dispensed.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          None.
        </Typography>
      ) : (
        trace.dispensed.map((d, i) => (
          <Typography key={i} variant="body2">
            {d.patient_ref} · {Number(d.qty)} · prescriber {d.prescriber ?? '—'} · {new Date(d.posted_at).toLocaleDateString()}
          </Typography>
        ))
      )}
    </Paper>
  )
}
