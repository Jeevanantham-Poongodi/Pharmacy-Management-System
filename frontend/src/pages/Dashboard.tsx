import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, LinearProgress, Link, Paper, Stack, Typography } from '@mui/material'
import { api, describeError, type Dashboard as Data } from '../api'
import { FLOW_PATHS, useReference } from '../state/reference'

export function Dashboard() {
  const { flows } = useReference()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.dashboard().then(setData, (e) => setError(describeError(e)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return <LinearProgress />

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(3, 1fr)' } }}>
        {data.near_expiry.map((bucket) => (
          <Paper key={bucket.window_days} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Expiring within {bucket.window_days} days
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {bucket.batches}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              batch-locations · {Number(bucket.qty)} units
            </Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' } }}>
        {flows.map((flow) => {
          const rows = data.open_cases.filter((r) => r.flow === flow.flow)
          const total = rows.reduce((sum, r) => sum + r.count, 0)
          return (
            <Paper key={flow.flow} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                <Link component={RouterLink} to={`/flows/${FLOW_PATHS[flow.flow]}`} underline="hover" sx={{ fontWeight: 600 }}>
                  {flow.flow}. {flow.title}
                </Link>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {total} open
                </Typography>
              </Stack>
              {rows.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Nothing open.
                </Typography>
              ) : (
                rows.map((r) => (
                  <Stack key={r.node} direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
                    <Link component={RouterLink} to={`/flows/${FLOW_PATHS[flow.flow]}?node=${r.node}`} variant="body2" underline="hover" color="inherit">
                      {r.node_label}
                    </Link>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.count}
                    </Typography>
                  </Stack>
                ))
              )}
            </Paper>
          )
        })}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Quarantine (not allocatable)</Typography>
          {data.quarantine.map((q) => (
            <Stack key={q.location_name} direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
              <Typography variant="body2">{q.location_name}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {Number(q.qty)}
              </Typography>
            </Stack>
          ))}
        </Paper>
      </Box>
    </Stack>
  )
}
