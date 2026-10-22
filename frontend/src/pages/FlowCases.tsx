import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { App as AntApp } from 'antd'
import { PlusOutlined, ScanOutlined } from '@ant-design/icons'
import { api, describeError } from '../api'
import { useAsync } from '../hooks/useAsync'
import { flowFromPath } from '../state/flowPaths'
import { useReference } from '../state/referenceContext'
import { hasNewCaseForm } from './newCase/forms'
import { NewCaseDialog } from './newCase/NewCaseDialog'

export function FlowCases() {
  const { flowPath } = useParams()
  const flowNumber = flowFromPath(flowPath)
  const { flow } = useReference()
  const definition = flowNumber ? flow(flowNumber) : undefined
  const [params, setParams] = useSearchParams()
  const node = params.get('node') ?? ''
  const show = params.get('show') ?? 'open'
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const list = useAsync(
    () => api.listCases({ flow: flowNumber, node: node || undefined, open: show === 'all' ? undefined : show === 'open' }),
    `cases-${flowNumber}-${node}-${show}`,
  )
  const cases = list.data ?? list.previous
  const error = list.error

  if (!definition) return <Alert severity="error">Unknown flow.</Alert>

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  async function scan() {
    setScanning(true)
    try {
      const result = await api.expiryScan()
      message.success(result.created ? `${result.created} expiry case(s) created` : 'No new near-expiry stock found')
      list.reload()
    } catch (e) {
      message.error(describeError(e))
    } finally {
      setScanning(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            Flow {definition.flow}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {definition.title}
          </Typography>
        </Box>
        {definition.flow === 4 && (
          <Button variant="outlined" startIcon={<ScanOutlined />} disabled={scanning} onClick={() => void scan()}>
            Run daily expiry scan
          </Button>
        )}
        {hasNewCaseForm(definition.flow) && (
          <Button variant="contained" disableElevation startIcon={<PlusOutlined />} onClick={() => setCreating(true)}>
            New
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <TextField select size="small" label="Step" value={node} onChange={(e) => setParam('node', e.target.value)} sx={{ minWidth: 280 }}>
            <MenuItem value="">All steps</MenuItem>
            {definition.nodes.map((n) => (
              <MenuItem key={n.key} value={n.key}>
                {n.label}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup size="small" exclusive value={show} onChange={(_, v) => v && setParam('show', v === 'open' ? '' : v)}>
            <ToggleButton value="open">Open</ToggleButton>
            <ToggleButton value="closed">Closed</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {cases === null ? (
          <LinearProgress />
        ) : cases.length === 0 ? (
          <Stack spacing={1} sx={{ py: 3, alignItems: 'center' }}>
            <Typography sx={{ color: 'text.secondary' }}>
              {node || show !== 'open' ? 'No cases at this step right now.' : 'No open cases yet.'}
            </Typography>
            {(node || show !== 'open') && (
              <Button size="small" onClick={() => setParams({ show: 'all' })}>
                Show all cases
              </Button>
            )}
          </Stack>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Current step</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                    <TableCell>
                      <Link component={RouterLink} to={`/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>
                        {c.id}
                      </Link>
                    </TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>
                      <Chip size="small" label={c.node_label} color={c.closed ? 'default' : 'primary'} variant={c.closed ? 'outlined' : 'filled'} />
                    </TableCell>
                    <TableCell>{new Date(c.updated_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {creating && (
        <NewCaseDialog flow={definition.flow} onClose={() => setCreating(false)} onCreated={(c) => navigate(`/cases/${c.id}`)} />
      )}
    </Stack>
  )
}
