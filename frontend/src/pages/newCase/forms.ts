// Flows whose cases are raised from a form. Flow 4 cases come from the daily expiry scan.
export const NEW_CASE_FLOWS = [1, 2, 3, 5]

export function hasNewCaseForm(flow: number) {
  return NEW_CASE_FLOWS.includes(flow)
}
