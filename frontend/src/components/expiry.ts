// Whole days from today (local time) until an ISO date; negative once past.
export function daysUntil(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
}
