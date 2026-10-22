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

// Feature 002 — flow pages (specs/002-flow-pages/contracts/openapi.yaml)

export type FlowNode = { key: string; label: string; kind: 'start' | 'task' | 'decision' | 'end' }

export type FlowEdge = {
  id: string
  from: string
  to: string
  outcome: string | null
  approval: boolean
  reason: boolean
  inputs: string[]
}

export type FlowDefinition = { flow: number; title: string; starts: string[]; nodes: FlowNode[]; edges: FlowEdge[] }

export type CaseSummary = {
  id: number
  flow: number
  node: string
  node_label: string
  title: string
  closed: boolean
  parent_case_id: number | null
  created_at: string
  updated_at: string
}

export type CaseLine = {
  id: number
  item_id: number
  item_name: string
  batch_id: number | null
  batch_no: string | null
  expiry_date: string | null
  location_id: number | null
  location_name: string | null
  qty_requested: string
  qty_approved: string | null
}

export type CaseEvent = {
  id: number
  from_node: string | null
  outcome: string | null
  to_node: string
  actor_name: string
  note: string | null
  created_at: string
}

export type CaseDetail = CaseSummary & {
  data: Record<string, unknown>
  lines: CaseLine[]
  events: CaseEvent[]
  actions: FlowEdge[]
  child_case_ids: number[]
}

export type CaseCreate = {
  flow: number
  start: string
  title: string
  data?: Record<string, unknown>
  lines?: { item_id: number; qty: number; batch_id?: number; location_id?: number }[]
}

export type ActionRequest = { edge: string; note?: string; input?: Record<string, unknown> }

export type Location = { id: number; code: string; name: string; kind: string; allocatable: boolean }
export type Vendor = { id: number; name: string }
export type Batch = {
  id: number
  item_id: number
  item_name: string
  batch_no: string
  expiry_date: string
  vendor_id: number | null
  blocked: boolean
}

export type Balance = {
  location_id: number
  location_name: string
  location_kind: string
  item_id: number
  item_name: string
  batch_id: number
  batch_no: string
  expiry_date: string
  blocked: boolean
  qty: string
}

export type BatchTrace = {
  batch: Batch
  holdings: Balance[]
  dispensed: { patient_ref: string | null; prescriber: string | null; qty: string; posted_at: string }[]
}

export type Dashboard = {
  open_cases: { flow: number; node: string; node_label: string; count: number }[]
  near_expiry: { window_days: number; batches: number; qty: string }[]
  quarantine: { location_name: string; qty: string }[]
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

  flows: () => request<FlowDefinition[]>('/api/v1/flows'),
  listCases: (params: { flow?: number; node?: string; open?: boolean } = {}) =>
    request<CaseSummary[]>(`/api/v1/cases${query(params)}`),
  getCase: (id: number) => request<CaseDetail>(`/api/v1/cases/${id}`),
  createCase: (input: CaseCreate) => request<CaseDetail>('/api/v1/cases', { method: 'POST', body: input }),
  takeAction: (id: number, action: ActionRequest) =>
    request<CaseDetail>(`/api/v1/cases/${id}/actions`, { method: 'POST', body: action }),
  expiryScan: () => request<{ created: number; case_ids: number[] }>('/api/v1/expiry/scan', { method: 'POST' }),
  locations: () => request<Location[]>('/api/v1/locations'),
  vendors: () => request<Vendor[]>('/api/v1/vendors'),
  batches: (itemId?: number) => request<Batch[]>(`/api/v1/batches${query({ item_id: itemId })}`),
  balances: (params: { location_id?: number; item_id?: number } = {}) =>
    request<Balance[]>(`/api/v1/stock/balances${query(params)}`),
  batchTrace: (id: number) => request<BatchTrace>(`/api/v1/batches/${id}/trace`),
  dashboard: () => request<Dashboard>('/api/v1/dashboard'),
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : ''
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
