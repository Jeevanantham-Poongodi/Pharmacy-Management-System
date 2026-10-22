import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, describeError, type ControlledClass, type FormularyStatus, type Item, type ItemInput } from '../api'

const FORMULARY: Record<FormularyStatus, string> = { formulary: 'Formulary', non_formulary: 'Non-formulary' }
const CONTROLLED: Record<ControlledClass, string> = { none: 'None', narcotic: 'Narcotic', schedule_x: 'Schedule X' }

const EMPTY: ItemInput = { name: '', base_unit: '', formulary_status: 'formulary', controlled_class: 'none' }

export function Items({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<Item[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [form, setForm] = useState<ItemInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setListError(null)
    try {
      setItems(await api.listItems(q.trim() || undefined))
    } catch (error) {
      setListError(describeError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load('')
  }, [load])

  async function create(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    setNotice(null)
    try {
      const item = await api.createItem({ ...form, name: form.name.trim(), base_unit: form.base_unit.trim() })
      setNotice(`Saved “${item.name}”.`)
      setForm(EMPTY)
      await load(query)
    } catch (error) {
      setFormError(describeError(error))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: Item) {
    const reason = window.prompt(`Reason for ${item.active ? 'deactivating' : 'reactivating'} “${item.name}”:`)
    if (reason === null) return
    setNotice(null)
    try {
      await api.setItemActive(item.id, !item.active, reason)
      setNotice(`“${item.name}” ${item.active ? 'deactivated' : 'reactivated'}.`)
      await load(query)
    } catch (error) {
      setListError(describeError(error))
    }
  }

  return (
    <section className="stack">
      {canWrite && (
        <form className="card" onSubmit={create} aria-label="New item">
          <h2>New item</h2>
          <div className="grid">
            <label>
              Name
              <input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Base unit
              <input
                required
                maxLength={200}
                placeholder="tablet, vial, ml…"
                value={form.base_unit}
                onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
              />
            </label>
            <label>
              Formulary status
              <select
                value={form.formulary_status}
                onChange={(e) => setForm({ ...form, formulary_status: e.target.value as FormularyStatus })}
              >
                {Object.entries(FORMULARY).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Narcotic / Schedule X
              <select
                value={form.controlled_class}
                onChange={(e) => setForm({ ...form, controlled_class: e.target.value as ControlledClass })}
              >
                {Object.entries(CONTROLLED).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          {formError && <p className="error" role="alert">{formError}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save item'}</button>
        </form>
      )}

      <div className="card">
        <div className="row">
          <h2>Item master</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              void load(query)
            }}
          >
            <input aria-label="Search items" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit">Search</button>
          </form>
        </div>
        {notice && <p className="success" role="status">{notice}</p>}
        {listError && <p className="error" role="alert">{listError}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">No items yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Base unit</th>
                <th>Formulary</th>
                <th>Narcotic / Schedule X</th>
                <th>Status</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={item.active ? '' : 'inactive'}>
                  <td>{item.name}</td>
                  <td>{item.base_unit}</td>
                  <td>{FORMULARY[item.formulary_status]}</td>
                  <td>{CONTROLLED[item.controlled_class]}</td>
                  <td>{item.active ? 'Active' : 'Inactive'}</td>
                  {canWrite && (
                    <td>
                      <button type="button" className="link" onClick={() => void toggleActive(item)}>
                        {item.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
