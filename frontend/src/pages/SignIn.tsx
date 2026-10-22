import { useState, type FormEvent } from 'react'
import { auth } from '../supabaseClient'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!auth) return
    setBusy(true)
    setError(null)
    const { error: signInError } = await auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (signInError) setError(signInError.message)
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>Sign in</h2>
      <p className="muted">Accounts are created by your hospital administrator.</p>
      <label>
        Email
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
