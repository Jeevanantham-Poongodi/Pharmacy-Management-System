import { useEffect, useState, type FormEvent } from 'react'
import { auth } from '../supabaseClient'

// Privileged roles must sign in with MFA (FR-008). Users without an authenticator app set up
// enrol one here; users who have one enter a code.

type Enrolment = { factorId: string; qrCode: string; secret: string }

export function MfaStep({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!auth) return
    let cancelled = false
    void (async () => {
      const { data, error: listError } = await auth.mfa.listFactors()
      if (cancelled) return
      if (listError) return setError(listError.message)
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) return setFactorId(verified.id)
      const { data: enrolled, error: enrolError } = await auth.mfa.enroll({ factorType: 'totp' })
      if (cancelled) return
      if (enrolError) return setError(enrolError.message)
      setEnrolment({ factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret })
      setFactorId(enrolled.id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function verify(event: FormEvent) {
    event.preventDefault()
    if (!auth || !factorId) return
    setBusy(true)
    setError(null)
    const { error: verifyError } = await auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    setBusy(false)
    if (verifyError) return setError(verifyError.message)
    onDone()
  }

  return (
    <form className="card narrow" onSubmit={verify}>
      <h2>Multi-factor sign-in</h2>
      {enrolment ? (
        <>
          <p>Your role needs an authenticator app. Scan this code, then enter the 6-digit code it shows.</p>
          <img src={enrolment.qrCode} alt="Authenticator QR code" width={180} height={180} />
          <p className="muted">
            Or enter this key: <code>{enrolment.secret}</code>
          </p>
        </>
      ) : (
        <p>Enter the 6-digit code from your authenticator app.</p>
      )}
      <label>
        Code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy || !factorId}>
        {busy ? 'Checking…' : 'Verify'}
      </button>
    </form>
  )
}
