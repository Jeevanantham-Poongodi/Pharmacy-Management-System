import { useState, type FormEvent } from 'react'
import { Box, Button, CircularProgress, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material'
import { Alert, App as AntApp } from 'antd'
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, MedicineBoxOutlined, UserOutlined } from '@ant-design/icons'
import { auth } from '../supabaseClient'

// This is a demo app with no self-registration, so the demo account is filled in as soon as
// either field is focused.
const demoEmail = (import.meta.env.VITE_DEMO_EMAIL as string | undefined) ?? ''
const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? ''

export function SignIn() {
  const { message } = AntApp.useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  function fillDemo() {
    if (email || password || !demoEmail) return
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!auth) return
    setBusy(true)
    const { error } = await auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) message.error(error.message)
    else message.success('Signed in')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Paper component="form" onSubmit={submit} elevation={0} sx={{ width: '100%', maxWidth: 400, p: 4, border: 1, borderColor: 'divider' }}>
        <Stack spacing={2.5}>
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: '#fff', fontSize: 24 }}>
              <MedicineBoxOutlined />
            </Box>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
              Pharmacy Management System
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Sign in to continue
            </Typography>
          </Stack>

          {demoEmail && <Alert type="info" showIcon title="Demo app: click a field to fill in the demo account." />}

          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            required
            fullWidth
            value={email}
            onFocus={fillDemo}
            onChange={(e) => setEmail(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><UserOutlined /></InputAdornment> } }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            fullWidth
            value={password}
            onFocus={fillDemo}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><LockOutlined /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                      {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button type="submit" variant="contained" size="large" disableElevation disabled={busy} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
