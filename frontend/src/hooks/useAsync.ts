import { useEffect, useEffectEvent, useState } from 'react'
import { describeError } from '../api'

type State<T> = { key: string; data: T | null; error: string | null }

// Loads data whenever `key` changes. State is only set from the promise callbacks, never
// synchronously in the effect, and a stale response (an older key) is ignored.
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState<State<T>>({ key: '', data: null, error: null })
  const fullKey = `${key}#${version}`
  // The latest `load` without making it a dependency; `fullKey` names what it loads.
  const run = useEffectEvent(load)

  useEffect(() => {
    let current = true
    run().then(
      (data) => current && setState({ key: fullKey, data, error: null }),
      (error) => current && setState({ key: fullKey, data: null, error: describeError(error) }),
    )
    return () => {
      current = false
    }
  }, [fullKey])

  const fresh = state.key === fullKey
  return {
    data: fresh ? state.data : null,
    // Keep showing the previous data while a reload is in flight, so lists don't flicker.
    previous: state.data,
    loading: !fresh,
    error: fresh ? state.error : null,
    reload: () => setVersion((v) => v + 1),
  }
}
