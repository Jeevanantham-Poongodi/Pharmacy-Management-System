import { createContext, useContext } from 'react'
import type { FlowDefinition, Item, Location, Vendor } from '../api'

export type Reference = {
  flows: FlowDefinition[]
  items: Item[]
  locations: Location[]
  vendors: Vendor[]
  flow: (n: number) => FlowDefinition | undefined
  nodeLabel: (flow: number, node: string) => string
  reload: () => void
}

export const ReferenceContext = createContext<Reference | null>(null)

export function useReference(): Reference {
  const value = useContext(ReferenceContext)
  if (!value) throw new Error('useReference outside ReferenceProvider')
  return value
}
