import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, describeError, type FlowDefinition, type Item, type Location, type Vendor } from '../api'

// Data every flow screen needs: the flow definitions (the diagram as data, served by the backend)
// and the masters used in forms. Loaded once after sign-in.

type Reference = {
  flows: FlowDefinition[]
  items: Item[]
  locations: Location[]
  vendors: Vendor[]
  flow: (n: number) => FlowDefinition | undefined
  nodeLabel: (flow: number, node: string) => string
  reload: () => void
}

const ReferenceContext = createContext<Reference | null>(null)

export type ReferenceState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; flows: FlowDefinition[]; items: Item[]; locations: Location[]; vendors: Vendor[] }

export function ReferenceProvider({ children, fallback }: { children: ReactNode; fallback: (s: ReferenceState) => ReactNode }) {
  const [data, setData] = useState<ReferenceState>({ state: 'loading' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.flows(), api.listItems(), api.locations(), api.vendors()]).then(
      ([flows, items, locations, vendors]) => {
        if (!cancelled) setData({ state: 'ready', flows, items, locations, vendors })
      },
      (error) => {
        if (!cancelled) setData({ state: 'error', message: describeError(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  if (data.state !== 'ready') return <>{fallback(data)}</>

  const flow = (n: number) => data.flows.find((f) => f.flow === n)
  const value: Reference = {
    ...data,
    flow,
    nodeLabel: (n, node) => flow(n)?.nodes.find((x) => x.key === node)?.label ?? node,
    reload,
  }
  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): Reference {
  const value = useContext(ReferenceContext)
  if (!value) throw new Error('useReference outside ReferenceProvider')
  return value
}

export const FLOW_PATHS: Record<number, string> = {
  1: 'procurement',
  2: 'ward-indent',
  3: 'dispensing',
  4: 'expiry',
  5: 'recall',
}

export function flowFromPath(path: string | undefined): number | undefined {
  const entry = Object.entries(FLOW_PATHS).find(([, p]) => p === path)
  return entry ? Number(entry[0]) : undefined
}
