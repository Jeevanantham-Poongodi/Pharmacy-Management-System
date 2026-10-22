import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { App as AntApp, ConfigProvider } from 'antd'
import './index.css'
import App from './App.tsx'

// MUI renders the forms and layout; Ant Design supplies feedback (alerts, toasts) and icons.
// Both share one primary colour so they read as a single design.
const primary = '#0f766e'

const muiTheme = createTheme({
  palette: { primary: { main: primary }, background: { default: '#f5f7f8' } },
  shape: { borderRadius: 10 },
  typography: { fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif", button: { textTransform: 'none', fontWeight: 600 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <ConfigProvider theme={{ token: { colorPrimary: primary, borderRadius: 10 } }}>
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
