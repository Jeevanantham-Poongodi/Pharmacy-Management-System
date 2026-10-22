import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  AlertOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  MenuOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { Health, Me } from '../api'

const WIDTH = 232

const NAV = [
  { to: '/', label: 'Dashboard', icon: <AppstoreOutlined /> },
  { to: '/flows/procurement', label: 'Procurement', icon: <ShoppingCartOutlined /> },
  { to: '/flows/ward-indent', label: 'Ward indent', icon: <SolutionOutlined /> },
  { to: '/flows/dispensing', label: 'Dispensing', icon: <MedicineBoxOutlined /> },
  { to: '/flows/expiry', label: 'Expiry', icon: <ClockCircleOutlined /> },
  { to: '/flows/recall', label: 'Recall', icon: <AlertOutlined /> },
  { divider: true },
  { to: '/stock', label: 'Stock', icon: <DatabaseOutlined /> },
  { to: '/items', label: 'Items', icon: <TagsOutlined /> },
] as const

export function AppShell({
  me,
  health,
  onSignOut,
  children,
}: {
  me: Me
  health: Health | null
  onSignOut: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const nav = (
    <Box sx={{ py: 1 }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <MedicineBoxOutlined />
        </Box>
        <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }}>Pharmacy</Typography>
      </Toolbar>
      <List dense>
        {NAV.map((entry, i) =>
          'divider' in entry ? (
            <Divider key={i} sx={{ my: 1 }} />
          ) : (
            <ListItemButton
              key={entry.to}
              component={NavLink}
              to={entry.to}
              selected={entry.to === '/' ? pathname === '/' : pathname.startsWith(entry.to)}
              onClick={() => setOpen(false)}
              sx={{ mx: 1, borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 34, fontSize: 16 }}>{entry.icon}</ListItemIcon>
              <ListItemText primary={entry.label} />
            </ListItemButton>
          ),
        )}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', ml: { md: `${WIDTH}px` }, width: { md: `calc(100% - ${WIDTH}px)` } }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton sx={{ display: { md: 'none' } }} onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuOutlined />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          {health && (
            <Chip
              size="small"
              variant="outlined"
              color={health.status === 'ok' ? 'success' : 'warning'}
              label={`API ${health.status} · DB ${health.database.replace('_', ' ')}`}
            />
          )}
          <Chip size="small" icon={<UserOutlined />} label={`${me.display_name} · ${me.roles.join(', ')}`} />
          <IconButton onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogoutOutlined />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: WIDTH }, flexShrink: 0 }}>
        <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: WIDTH } }}>
          {nav}
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}>
          {nav}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, mt: 8 }}>
        {children}
      </Box>
    </Box>
  )
}
