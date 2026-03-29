# synced-wphub

The CLI for Synced — AI-driven WordPress development. One command to go from zero to a running local WordPress site with a custom theme, GitHub repo, and VS Code open.

## Commands

- **`synced new "Client Name"`** — scaffold a new WordPress site with the Synced WP starter theme, brand colours, GitHub repo, and VS Code
- **`synced theme "Client Name"`** — update brand colours for an existing site
- **`synced setup`** — first-run configuration (sites path, GitHub, AI provider)

## Prerequisites

These must be in place before installing Synced:

- **Git** — installed and in PATH
- **Node.js 18+**
- **GitHub account** with a Personal Access Token (repo scope) — [create one here](https://github.com/settings/tokens)
- **VS Code** (`code` in PATH — optional, for auto-open)

## Installation

```bash
cd synced-wphub
npm install
npm link
```

Then use `synced` from anywhere in your terminal.

---

## Usage

### First-time setup

```bash
synced setup
```

Configures:
1. Where to store your sites (default: `~/synced-sites`)
2. GitHub Personal Access Token for repo creation (your own token, your repos)
3. AI provider (Claude / ChatGPT/Codex / Other)

Config stored at `~/.synced/config.json`.

---

### Create a new site

```bash
synced new "Acme Corp"
```

This will:
1. Create `~/synced-sites/acme-corp/`
2. Install the Synced WP starter theme into `wp-content/themes/acme-corp/`
3. Rename theme placeholders to the client name
4. Ask for brand colours (or use neutral defaults — update later with `synced theme`)
5. Apply colours to CSS custom properties in `assets/src/css/variables.css`
6. Create a private GitHub repo under your account and push the initial commit
7. Create `AGENTS.md` (and `CLAUDE.md` if AI = Claude) at the WordPress root
8. Start WordPress via `wp-now`
9. Open VS Code at the WordPress root

---

### Update theme colours

```bash
synced theme "Acme Corp"
```

Updates brand colours and commits if GitHub is connected.

---

## Config

`~/.synced/config.json`

```json
{
  "sitesPath": "~/synced-sites",
  "github": {
    "token": "ghp_...",
    "connected": true
  },
  "ai": "claude"
}
```

---

## Project structure

```
synced-wphub/
├── package.json
├── bin/
│   └── synced.js           # CLI entry point
├── src/
│   ├── commands/
│   │   ├── new.js          # synced new "Client Name"
│   │   ├── theme.js        # synced theme "Client Name"
│   │   └── setup.js        # synced setup
│   ├── lib/
│   │   ├── config.js       # ~/.synced/config.json helpers
│   │   ├── github.js       # GitHub repo creation via @octokit/rest
│   │   ├── wordpress.js    # wp-now wrapper
│   │   ├── mysql.js        # MySQL management (Phase 2)
│   │   ├── scaffold.js     # AI scaffolding (Phase 2)
│   │   └── boilerplate.js  # Clone and configure Synced WP theme
│   └── utils/
│       ├── logger.js       # Coloured console output
│       └── prompt.js       # Interactive prompts
└── README.md
```

---

## Starter theme

Uses `synced-wptheme` — a clean WordPress starter theme with Tailwind v4 and Vite, built and owned by Synced.

---

## Roadmap

- **Phase 2:** AI scaffolding — generate theme config from a client brief
- **Phase 2:** Per-site MySQL instance management
- **Phase 2:** `synced push / pull` — sync local DB and files to staging
- **Phase 2:** `synced deploy` — host-agnostic deploy via GitHub Actions
- **Phase 2:** `synced list` / `synced start` / `synced stop`
