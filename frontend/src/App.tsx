import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Alert, LinearProgress } from '@mui/material'
import './App.css'
import { api, ApiError, describeError, type Health, type Me } from './api'
import { auth, authConfigError } from './supabaseClient'
import { Items } from './pages/Items'
import { MfaStep } from './pages/MfaStep'
import { SignIn } from './pages/SignIn'
import { AppShell } from './layout/AppShell'
import { CaseDetail } from './pages/CaseDetail'
import { Dashboard } from './pages/Dashboard'
import { FlowCases } from './pages/FlowCases'
import { Stock } from './pages/Stock'
import { ReferenceProvider } from './state/reference'
import { loadReference } from './state/referenceData'

type Profile = { state: 'loading' } | { state: 'ready'; me: Me } | { state: 'mfa' } | { state: 'error'; message: string }

// Sets the profile only when the request settles (never synchronously inside an effect).
function fetchProfile(setProfile: (profile: Profile) => void) {
  return api.me().then(
    (me) => setProfile({ state: 'ready', me }),
    (error) =>
      setProfile(
        error instanceof ApiError && error.code === 'MFA_REQUIRED'
          ? { state: 'mfa' }
          : { state: 'error', message: describeError(error) },
      ),
  )
}

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

  const loadProfile = () => void fetchProfile(setProfile)

  const accessToken = session?.access_token
  useEffect(() => {
    if (!accessToken) return
    void fetchProfile(setProfile)
    // Start the reference data at the same time; the screens' provider picks up this request.
    loadReference().catch(() => {})
  }, [accessToken])

  if (!authConfigError && !session) return <SignIn />

  // Signed in with a usable profile: the flow screens inside the shell.
  if (!authConfigError && profile.state === 'ready') {
    const me = profile.me
    return (
      <BrowserRouter>
        <AppShell me={me} health={health} onSignOut={() => void auth?.signOut()}>
          <ReferenceProvider
            fallback={(s) =>
              s.state === 'error' ? <Alert severity="error">{s.message}</Alert> : <LinearProgress />
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/flows/:flowPath" element={<FlowCases />} />
              <Route path="/cases/:caseId" element={<CaseDetail />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/items" element={<Items canWrite={me.permissions.includes('items.write')} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ReferenceProvider>
        </AppShell>
      </BrowserRouter>
    )
  }

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
        ) : profile.state === 'mfa' ? (
          <MfaStep onDone={loadProfile} />
        ) : profile.state === 'error' ? (
          <div className="card">
            <p className="error" role="alert">{profile.message}</p>
            <button
              type="button"
              onClick={() => {
                setProfile({ state: 'loading' })
                loadProfile()
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="muted">Loading your account…</p>
        )}
      </main>
    </div>
  )
}

export default App
