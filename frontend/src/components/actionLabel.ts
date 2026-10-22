import type { FlowEdge } from '../api'

// The diagram's outcome label, or the step an unlabelled arrow leads to.
export function actionLabel(edge: FlowEdge, targetLabel: (node: string) => string): string {
  return edge.outcome ?? `Continue: ${targetLabel(edge.to)}`
}
