# WORLDQUEST

Independent, login-free WorldQuest application. The React/Vite frontend talks to a standalone Node.js API. SQLite stores players, quests, answer keys, submissions, teams, claims, comments, reports and feedback.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
```

Start the API in one terminal:

```bash
npm run dev:api
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to http://localhost:3001. The API creates `data/worldquest.sqlite` automatically.

## Production deployment

Deploy the API as a persistent Node web service (Render is configured by `render.yaml`). It must have a persistent disk mounted at `/var/data`, with `DB_PATH=/var/data/worldquest.sqlite`.

Deploy the frontend as a static site (Netlify, Vercel, or equivalent) using:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://YOUR-API-SERVICE.onrender.com`

Set the API environment variable `CORS_ORIGIN` to the exact frontend origin (for example, your Netlify URL). Do not use a temporary filesystem for production database storage.

## Anonymous player identity

On first visit the browser generates a Player ID and a private 256-bit device secret. The secret remains in that browser's local storage; the server stores only its SHA-256 hash. Players do not create accounts or enter passwords. Clearing browser storage or changing devices creates a new identity; there is no account recovery mechanism.

## API

- `GET /api/health`
- `POST /api/playerApi`
- `POST /api/worldquestApi`
- `POST /api/teamApi`
- `POST /api/gradeSubmission`
- `POST /api/reportQuest`
- `POST /api/checkLinks`

All player-facing actions require the generated Player ID and device secret. The frontend sends these automatically.

## Database

SQLite is deliberately self-contained for the first independent deployment. Back up the persistent database file regularly. For high-traffic multi-instance deployment, migrate the storage layer to managed PostgreSQL before scaling horizontally.
