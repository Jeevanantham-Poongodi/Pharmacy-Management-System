import { api, type FlowDefinition, type Item, type Location, type Vendor } from '../api'

export type ReferenceData = { flows: FlowDefinition[]; items: Item[]; locations: Location[]; vendors: Vendor[] }

let pending: Promise<ReferenceData> | null = null

// One shared request for the reference data. App starts it as soon as there is a session, in
// parallel with the profile, so screens don't wait for the two one after the other.
export function loadReference(force = false): Promise<ReferenceData> {
  if (!pending || force) {
    const request = Promise.all([api.flows(), api.listItems(), api.locations(), api.vendors()]).then(
      ([flows, items, locations, vendors]) => ({ flows, items, locations, vendors }),
    )
    // A failed load is not kept, so the next call tries again.
    request.catch(() => {
      if (pending === request) pending = null
    })
    pending = request
  }
  return pending
}
