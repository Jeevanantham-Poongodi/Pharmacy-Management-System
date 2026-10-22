import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, describeError, type FlowDefinition, type Item, type Location, type Vendor } from '../api'
import { ReferenceContext, type Reference } from './referenceContext'

// Data every flow screen needs: the flow definitions (the diagram as data, served by the backend)
// and the masters used in forms. Loaded once after sign-in.


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
