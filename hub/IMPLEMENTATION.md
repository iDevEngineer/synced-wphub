# Synced Hub — Implementation Summary

## What Was Built

A complete Next.js 14 web dashboard for the Synced WordPress CLI, enabling visual management of local sites, staging configuration, and deployment workflows.

## File Structure

```
hub/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── config/route.ts     # Global config GET/PUT
│   │   └── sites/
│   │       ├── route.ts        # List all sites
│   │       └── [slug]/
│   │           ├── route.ts    # Get site detail
│   │           ├── start/      # POST to start
│   │           ├── stop/       # POST to stop
│   │           ├── deploy/     # POST to deploy
│   │           ├── push/       # POST to push to staging
│   │           └── pull/       # POST to pull from staging
│   ├── lib/                    # Server-side lib wrappers
│   │   ├── config-server.ts    # Config file I/O
│   │   ├── sites-server.ts     # Site registry management
│   │   ├── staging-server.ts   # Staging config I/O
│   │   ├── wordpress-server.ts # WP-now integration
│   │   ├── ssh-server.ts       # SSH helpers
│   │   └── providers-server.ts # Provider module loader
│   ├── layout.tsx              # Root layout (dark theme)
│   ├── page.tsx                # Main sites view + sidebar
│   ├── settings/page.tsx       # Settings page
│   └── globals.css             # Tailwind CSS
├── components/                 # React components
│   ├── SiteList.tsx           # Sidebar site list (polling 3s)
│   ├── SiteCard.tsx           # Individual site card
│   ├── SiteDetail.tsx         # Main panel (selected site)
│   ├── DeployPanel.tsx        # Deploy section
│   ├── SyncPanel.tsx          # Push/Pull section
│   └── SettingsForm.tsx       # Settings form
├── lib/
│   └── api.ts                 # Client-side fetch helpers
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind theme (dark)
├── next.config.ts             # Next.js config (ESM support)
├── postcss.config.js          # PostCSS + Tailwind
├── .gitignore
├── .env.example
└── README.md
```

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS v3
- **Icons:** Lucide React
- **Data fetching:** SWR (client-side polling)
- **Language:** TypeScript (100%)
- **Build:** Standard Next.js

## Key Features

### 1. Sites List (Sidebar)
- Polls every 3 seconds for running status
- Shows site name + status indicator (orange = running, grey = stopped)
- Displays URL when running
- Auto-selects first running site, else first site
- "Create site" button (opens terminal hint)

### 2. Site Detail Panel (Right)
- Start/Stop buttons (context-aware)
- "Open in browser" button (when running)
- Deploy panel (provider badge + deploy button)
- Sync panel (push/pull with destructive warning modal)
- Settings link for per-site staging config

### 3. Deploy Panel
- Shows provider and staging URL
- "Deploy" button
- Success/error messages from API
- Empty state if no staging configured

### 4. Sync Panel
- **Push:** Local DB → Staging (with media option)
- **Pull:** Staging DB → Local (with destructive warning modal)
- Side-by-side layout
- Success/error messages

### 5. Settings Page
- Local environment (sites path, WP-CLI path)
- Git & GitHub (username/org)
- Defaults (hosting provider select)
- Save confirmation message

### 6. API Routes
All routes are **thin wrappers** over CLI lib functions:

- **GET /api/sites** → merges getAllSites + running status
- **GET /api/sites/[slug]** → site detail + staging config
- **POST /api/sites/[slug]/start** → startWordPress + registerSite
- **POST /api/sites/[slug]/stop** → killWpNow + unregisterSite
- **POST /api/sites/[slug]/deploy** → git commit/push + provider.deploy
- **POST /api/sites/[slug]/push** → SSH backup + DB export/import + rsync media
- **POST /api/sites/[slug]/pull** → SSH backup + DB export/import + rsync media
- **GET /api/config** → readConfig
- **PUT /api/config** → writeConfig

### 7. Server Lib Wrappers
Standalone TypeScript modules in `app/lib/` that re-implement CLI lib functions to avoid ESM/CJS interop issues:

- `config-server.ts` — file I/O for ~/.synced/config.json
- `sites-server.ts` — site registry (running.json)
- `staging-server.ts` — staging config per site
- `wordpress-server.ts` — wp-now start/kill
- `ssh-server.ts` — SSH/SCP/rsync helpers
- `providers-server.ts` — dynamic provider loader

### 8. CLI Integration
**src/commands/hub.js** — starts Next.js server on port 3000 and opens browser
- Checks hub/ directory and node_modules
- Uses `next start` if built, `next dev` otherwise
- Opens browser after 1.5s delay
- Runs in foreground (keeps process alive)

**bin/synced.js** — registered as `synced hub` command

## Colors (Dark Theme)

```
#1a1d20  background
#2b2f33  sidebar
#e05a2b  accent (orange) — primary actions + running
#6b7280  stopped indicator
#f9fafb  text primary
#9ca3af  text muted
#3d4147  border
```

## Copy

All UI text is from `hub-copy.md` — no invented labels. Includes:

- Empty states
- Section headings (Deploy, Push/Pull, Settings)
- Button labels
- Error messages (SSH auth failed, WP-CLI not found)
- Warning modal for destructive pull
- Confirmation messages

## Installation & Running

### Development
```bash
cd hub
npm install
npm run dev
```

### Production Build
```bash
cd hub
npm install
npm run build
npm start
```

### Via CLI
```bash
synced hub
```

## Implementation Notes

1. **No shadcn/ui** — kept it simple with Tailwind only, no component library
2. **All TypeScript** — 100% type-safe throughout
3. **Server lib wrappers** — separate from CLI lib to avoid ESM issues in Next.js
4. **Graceful errors** — API routes return { error: string } on failure
5. **SWR polling** — 3-second refresh interval for site status
6. **Destructive warning** — Pull action requires confirmation
7. **Auto-select** — First running site, then first site
8. **Provider abstraction** — Loads providers dynamically from CLI src/lib/providers/

## Testing

To test locally:

1. Install dependencies: `cd hub && npm install`
2. Start dev server: `npm run dev`
3. Create a test site via CLI: `synced new "Test Site"`
4. Start it: `synced start "Test Site"`
5. Open http://localhost:3000 in browser
6. Site should appear in sidebar as running

## Future Enhancements

- Real-time WebSocket updates instead of polling
- Progress indicators for long-running operations (deploy, push, pull)
- Batch operations (start/stop multiple sites)
- Log viewer for deployment & push/pull output
- Staging config UI (wizard modal instead of settings page)
- Dark mode toggle (currently hardcoded dark)
- PWA manifest for installable dashboard
