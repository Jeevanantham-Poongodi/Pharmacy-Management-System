import { Chip } from '@mui/material'

// Colour by the expiry alert windows (F4:"Within 90, 60 or 30 days?").
export function daysUntil(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
}

export function ExpiryChip({ date }: { date: string }) {
  const days = daysUntil(date)
  const color = days <= 0 ? 'error' : days <= 30 ? 'error' : days <= 60 ? 'warning' : days <= 90 ? 'info' : 'default'
  const label = days <= 0 ? `${date} · expired` : days <= 90 ? `${date} · ${days}d` : date
  return <Chip size="small" variant={days <= 90 ? 'filled' : 'outlined'} color={color} label={label} />
}
