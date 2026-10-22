import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Link, Paper, Stack, Typography } from '@mui/material'
import { CompassOutlined } from '@ant-design/icons'
import { FLOW_PATHS } from '../state/flowPaths'

// A presenter's walk through the five flows (feature 003, FR-001). Each step links to the flow's
// cases at a step where the demo data leaves a case waiting.

const TOUR = [
  { flow: 1, node: 'f1_qc', title: 'Procurement', text: 'Pass QC for the IV fluids and watch the stock move from QC quarantine to the central store.' },
  { flow: 2, node: 'f2_review', title: 'Ward indent', text: 'Approve the ICU indent; the issue takes the earliest-expiry batches first.' },
  { flow: 3, node: 'f3_order', title: 'Patient dispensing', text: 'Verify order OP-1090 and dispense it; try a narcotic order to see the NDPS sign-off.' },
  { flow: 4, node: 'f4_writeoff', title: 'Expiry management', text: 'Approve the write-off of expired Cetirizine and dispose of it.' },
  { flow: 5, node: 'f5_dispensed', title: 'Recall', text: 'Ondansetron OND-1188 is recalled: see where it was and which patient received it.' },
]

const HIDDEN_KEY = 'pms.demoTour.hidden'

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(HIDDEN_KEY, '1')
    else localStorage.removeItem(HIDDEN_KEY)
  } catch {
    // Storage unavailable (private window): the choice lasts for this page only.
  }
}

export function DemoTour() {
  const [hidden, setHidden] = useState(readHidden)

  function toggle(next: boolean) {
    writeHidden(next)
    setHidden(next)
  }

  if (hidden)
    return (
      <Button size="small" startIcon={<CompassOutlined />} onClick={() => toggle(false)} sx={{ alignSelf: 'flex-start' }}>
        Show demo tour
      </Button>
    )

  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5, gap: 1 }}>
        <Box sx={{ color: 'primary.main', fontSize: 18, display: 'flex' }}>
          <CompassOutlined />
        </Box>
        <Typography sx={{ fontWeight: 600, flex: 1 }}>Demo tour: one step per flow</Typography>
        <Button size="small" onClick={() => toggle(true)}>
          Hide
        </Button>
      </Stack>
      <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1 }}>
        {TOUR.map((step) => (
          <li key={step.flow}>
            <Link component={RouterLink} to={`/flows/${FLOW_PATHS[step.flow]}?node=${step.node}`} underline="hover" sx={{ fontWeight: 600 }}>
              {step.title}
            </Link>
            <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
              {' '}
              — {step.text}
            </Typography>
          </li>
        ))}
      </Box>
    </Paper>
  )
}
