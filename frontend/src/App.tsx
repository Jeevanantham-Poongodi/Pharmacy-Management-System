import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { api, ApiError, describeError, type Health, type Me } from './api'
import { auth, authConfigError } from './supabaseClient'
import { Items } from './pages/Items'
import { MfaStep } from './pages/MfaStep'
import { SignIn } from './pages/SignIn'

type Profile = { state: 'loading' } | { state: 'ready'; me: Me } | { state: 'mfa' } | { state: 'error'; message: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile>({ state: 'loading' })

  useEffect(() => {
    api.health().then(setHealth, (error) => setHealthError(describeError(error)))
  }, [])

  useEffect(() => {
    if (!auth) return
    void auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async () => {
    setProfile({ state: 'loading' })
    try {
      setProfile({ state: 'ready', me: await api.me() })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'MFA_REQUIRED') setProfile({ state: 'mfa' })
      else setProfile({ state: 'error', message: describeError(error) })
    }
  }, [])

  const accessToken = session?.access_token
  useEffect(() => {
    if (accessToken) void loadProfile()
  }, [accessToken, loadProfile])

  return (
    <div className="app">
      <header>
        <h1>Pharmacy Management System</h1>
        <div className="row">
          <span className={`pill ${health?.status === 'ok' ? 'ok' : 'warn'}`}>
            {health
              ? `API ${health.status} · database ${health.database.replace('_', ' ')}`
              : healthError ?? 'Checking API…'}
          </span>
          {session && auth && (
            <button type="button" className="link" onClick={() => void auth?.signOut()}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <main>
        {authConfigError ? (
          <p className="error card">{authConfigError}</p>
        ) : !session ? (
          <SignIn />
        ) : profile.state === 'loading' ? (
          <p className="muted">Loading your account…</p>
        ) : profile.state === 'mfa' ? (
          <MfaStep onDone={() => void loadProfile()} />
        ) : profile.state === 'error' ? (
          <div className="card">
            <p className="error" role="alert">{profile.message}</p>
            <button type="button" onClick={() => void loadProfile()}>Retry</button>
          </div>
        ) : (
          <>
            <p className="muted">
              Signed in as <strong>{profile.me.display_name}</strong> · roles: {profile.me.roles.join(', ') || 'none'}
            </p>
            {profile.me.permissions.includes('items.read') ? (
              <Items canWrite={profile.me.permissions.includes('items.write')} />
            ) : (
              <p className="card">Your role has no access to the item master yet. Ask your administrator.</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
