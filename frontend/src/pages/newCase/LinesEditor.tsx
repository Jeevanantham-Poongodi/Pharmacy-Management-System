import { Box, Button, IconButton, MenuItem, Stack, TextField } from '@mui/material'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { Item } from '../../api'

export type DraftLine = { item_id: string; qty: string }

export const EMPTY_LINE: DraftLine = { item_id: '', qty: '' }

export function validLines(lines: DraftLine[]) {
  return lines
    .filter((l) => l.item_id && Number(l.qty) > 0)
    .map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty) }))
}

export function LinesEditor({
  items,
  lines,
  onChange,
}: {
  items: Item[]
  lines: DraftLine[]
  onChange: (lines: DraftLine[]) => void
}) {
  const set = (i: number, change: Partial<DraftLine>) =>
    onChange(lines.map((line, j) => (j === i ? { ...line, ...change } : line)))
  return (
    <Stack spacing={1.5}>
      {lines.map((line, i) => (
        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 40px', gap: 1, alignItems: 'center' }}>
          <TextField select size="small" label="Item" value={line.item_id} onChange={(e) => set(i, { item_id: e.target.value })}>
            {items
              .filter((item) => item.active)
              .map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.name}
                  {item.controlled_class !== 'none' ? ' · NDPS' : ''}
                  {item.formulary_status === 'non_formulary' ? ' · non-formulary' : ''}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label="Qty"
            value={line.qty}
            onChange={(e) => set(i, { qty: e.target.value })}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <IconButton aria-label="Remove line" disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, j) => j !== i))}>
            <DeleteOutlined />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<PlusOutlined />} onClick={() => onChange([...lines, EMPTY_LINE])} sx={{ alignSelf: 'flex-start' }}>
        Add line
      </Button>
    </Stack>
  )
}
