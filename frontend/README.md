# PMS Frontend

The web app for the Pharmacy Management System: React 19, TypeScript and Vite, with MUI for
layout and forms and Ant Design for messages, icons and the history timeline.

## Setup

```bash
npm install
```

Create `frontend/.env` (git-ignored; [.env.example](.env.example) lists the keys):

| Variable | What it is |
| --- | --- |
| `VITE_API_BASE_URL` | Backend URL, e.g. `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key. Never put the service-role key here |
| `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD` | Demo account filled in when a sign-in field is clicked (leave empty to turn off) |

Everything in this file is built into the JavaScript the browser downloads.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload on http://localhost:5173 |
| `npm run demo` | Production build served on http://localhost:5173: use this to present (faster, no development double-loading) |
| `npm run build` | Type-check and build into `dist/` |
| `npm test` | Vitest |
| `npm run lint` | Oxlint (expects 0 warnings) |

The backend only accepts requests from the origins in its `CORS_ORIGINS`, so keep port 5173.

## Screens

| Screen | Path |
| --- | --- |
| Sign-in | shown when signed out; clicking a field fills the demo account |
| Dashboard with demo tour | `/` |
| Flow case lists, filterable by step | `/flows/procurement`, `/flows/ward-indent`, `/flows/dispensing`, `/flows/expiry`, `/flows/recall` |
| Case page: flow map, outcome buttons, lines, history, linked cases, recall trace | `/cases/:id` |
| Stock balances by location, item and batch | `/stock` |
| Item master | `/items` |

Flow screens are drawn from `GET /api/v1/flows`, so a case page always offers exactly the arrows
the backend allows from the case's current box.

## Code layout

```
src/
├── App.tsx                 session, profile and routes
├── api/                    the only way to reach application data (decision D-001)
├── supabaseClient.ts       Supabase Auth only
├── layout/AppShell.tsx     sidebar and top bar
├── pages/                  Dashboard, FlowCases, CaseDetail, Stock, Items, SignIn, newCase/ forms
├── components/             ActionPanel, FlowMap, CaseHistory, LinesTable, DemoTour, ExpiryChip
├── state/                  shared reference data (flows, items, locations, vendors)
├── hooks/useAsync.ts       data loading
└── labels.ts               readable labels for stored codes
tests/                      Vitest
```
