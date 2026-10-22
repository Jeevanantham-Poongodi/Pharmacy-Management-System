export type DraftLine = { item_id: string; qty: string }

export const EMPTY_LINE: DraftLine = { item_id: '', qty: '' }

export function validLines(lines: DraftLine[]) {
  return lines
    .filter((l) => l.item_id && Number(l.qty) > 0)
    .map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty) }))
}
