# Synced Hub UI

Local Next.js web dashboard for managing WordPress sites via the Synced CLI.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Building

```bash
npm run build
npm start
```

## Running from CLI

```bash
synced hub
```

Starts the Next.js server and opens the browser automatically.

## Architecture

- **App Router** (Next.js 14)
- **Tailwind CSS** for styling
- **SWR** for client-side data fetching
- **API routes** as thin wrappers over CLI lib functions
- **Server lib wrappers** in `app/lib/` to avoid ESM/CJS interop issues

## File Structure

```
hub/
├── app/
│   ├── api/           # Next.js API routes
│   ├── lib/           # Server-side helpers
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Sites list (main view)
│   └── settings/      # Settings page
├── components/        # React components
├── lib/               # Client-side helpers (api.ts)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Colors

- Background: #1a1d20
- Sidebar: #2b2f33
- Accent: #e05a2b (orange)
- Text: #f9fafb
- Muted: #9ca3af
- Border: #3d4147
