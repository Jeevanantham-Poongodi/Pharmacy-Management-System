# PMS Frontend

The web interface for the Pharmacy Management System (PMS). It is built with React, TypeScript and Vite. It talks to the [PMS backend](https://github.com/Jeevanantham-Poongodi/PMS-backend) API and connects to [Supabase](https://supabase.com/) directly.

> **Status:** early setup. The app is still the Vite starter page. On load it checks the connection to Supabase and to the backend, and logs the results to the browser console. The pharmacy screens are planned.

## Tech stack

- React 19 with TypeScript
- Vite
- Supabase JS client (`@supabase/supabase-js`)
- Axios for calls to the backend
- Oxlint for linting

## Project structure

```
frontend/
├── index.html
├── public/                 # Static files served as-is
├── src/
│   ├── main.tsx            # App entry point
│   ├── App.tsx             # Root component (runs the connection checks)
│   ├── supabaseClient.ts   # Shared Supabase client
│   ├── App.css
│   ├── index.css
│   └── assets/
├── vite.config.ts
├── tsconfig*.json
└── .oxlintrc.json
```

## Prerequisites

- Node.js 20 or later, with npm
- The backend running locally or deployed (see the backend README)
- A Supabase project

## Environment variables

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

| Variable                 | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `VITE_API_BASE_URL`      | Base URL of the backend API, with no trailing slash |
| `VITE_SUPABASE_URL`      | Your Supabase project URL                           |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key                     |

Vite only exposes variables that start with `VITE_` to the browser. Everything in this file ends up in the built JavaScript, so never put a secret key here, such as the Supabase service role key.

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173. Open the browser console to see the results of the Supabase and backend connection checks.

The backend only accepts requests from `http://localhost:5173`, so keep the dev server on that port.

## Scripts

| Command           | Description                                         |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload                |
| `npm run build`   | Type-check and build for production into `dist/`    |
| `npm run preview` | Serve the production build locally                  |
| `npm run lint`    | Run Oxlint                                          |
