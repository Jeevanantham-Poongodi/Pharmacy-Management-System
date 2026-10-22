import { Chip } from '@mui/material'
import { daysUntil } from './expiry'

// Colour by the expiry alert windows (F4:"Within 90, 60 or 30 days?").
export function ExpiryChip({ date }: { date: string }) {
  const days = daysUntil(date)
  const color = days <= 0 ? 'error' : days <= 30 ? 'error' : days <= 60 ? 'warning' : days <= 90 ? 'info' : 'default'
  const label = days <= 0 ? `${date} · expired` : days <= 90 ? `${date} · ${days}d` : date
  return <Chip size="small" variant={days <= 90 ? 'filled' : 'outlined'} color={color} label={label} />
}
