import { Box, Chip, Stack, Typography } from '@mui/material'
import type { CaseEvent, FlowDefinition } from '../api'

// The flow's diagram nodes in order: the current one filled, the ones this case has passed
// through outlined in green, decision nodes marked with a diamond.

export function FlowMap({ flow, current, events }: { flow: FlowDefinition; current: string; events: CaseEvent[] }) {
  const visited = new Set(events.map((e) => e.to_node))
  return (
    <Box>
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {flow.nodes.map((node) => {
          const isCurrent = node.key === current
          const wasVisited = visited.has(node.key)
          return (
            <Chip
              key={node.key}
              size="small"
              label={`${node.kind === 'decision' ? '◇ ' : ''}${node.label}`}
              color={isCurrent ? 'primary' : wasVisited ? 'success' : 'default'}
              variant={isCurrent ? 'filled' : 'outlined'}
              sx={{
                opacity: isCurrent || wasVisited ? 1 : 0.55,
                fontWeight: isCurrent ? 600 : 400,
                borderStyle: node.kind === 'end' ? 'double' : 'solid',
                borderWidth: node.kind === 'end' ? 3 : 1,
              }}
            />
          )
        })}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
        Filled: current step · Green: steps this case has passed · ◇ decision · double border: end
      </Typography>
    </Box>
  )
}
