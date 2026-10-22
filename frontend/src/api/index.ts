import { auth } from '../supabaseClient'
import { ApiError, createApiClient } from './client'

export { ApiError }

export type FormularyStatus = 'formulary' | 'non_formulary'
export type ControlledClass = 'none' | 'narcotic' | 'schedule_x'

export type Item = {
  id: number
  name: string
  base_unit: string
  formulary_status: FormularyStatus
  controlled_class: ControlledClass
  active: boolean
  created_at: string
  updated_at: string
}

export type ItemInput = Pick<Item, 'name' | 'base_unit' | 'formulary_status' | 'controlled_class'>

export type Me = {
  user_id: string
  hospital_id: number
  display_name: string
  roles: string[]
  permissions: string[]
  mfa_satisfied: boolean
}

export type Health = { status: 'ok' | 'degraded'; database: 'ok' | 'unreachable' | 'not_configured' }

const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const request = createApiClient(baseUrl, async () => {
  if (!auth) return null
  const { data } = await auth.getSession()
  return data.session?.access_token ?? null
})

export const api = {
  health: () => request<Health>('/api/v1/health'),
  me: () => request<Me>('/api/v1/me'),
  listItems: (q?: string) => request<Item[]>(`/api/v1/items${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createItem: (input: ItemInput) => request<Item>('/api/v1/items', { method: 'POST', body: input }),
  setItemActive: (id: number, active: boolean, reason: string) =>
    request<Item>(`/api/v1/items/${id}`, { method: 'PATCH', body: { active, reason } }),
}

// A short, user-facing message for any error, with the request ID for support.
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = Array.isArray(error.details)
      ? (error.details as { field?: string; message?: string }[])
          .map((d) => `${d.field}: ${d.message}`)
          .join('; ')
      : ''
    const ref = error.requestId ? ` (ref ${error.requestId.slice(0, 8)})` : ''
    return `${error.message}${fields ? ` ${fields}` : ''}${ref}`
  }
  return 'Unexpected error.'
}
