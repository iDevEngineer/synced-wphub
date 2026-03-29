# Synced Hub CLI

A Node.js CLI tool for WordPress agencies to set up local development environments quickly and consistently.

## Features

- 🚀 **`synced new "Client Name"`** — scaffold a full WordPress site with the Boiled starter theme, brand colours, GitHub repo, and VS Code launch
- 🎨 **`synced theme "Client Name"`** — update brand colours for an existing site
- ⚙️ **`synced setup`** — first-run configuration (sites path, GitHub PAT, AI provider)

## Requirements

- Node.js 18+
- Git
- VS Code (`code` in PATH, optional)
- npx (bundled with npm)

## Installation

```bash
cd ~/.openclaw/projects/synced-hub
npm install
npm link
```

Then use `synced` anywhere in your terminal.

## Usage

### First-time setup

```bash
synced setup
```

Guides you through:
1. Where to store your sites (default: `~/Sites/Synced`)
2. GitHub Personal Access Token (repo scope) for auto-repo creation
3. AI provider preference (Claude / ChatGPT / Other / Skip)

Config stored at `~/.synced/config.json`.

---

### Create a new site

```bash
synced new "Acme Corp"
```

This will:
1. Create `~/Sites/Synced/acmecorp/`
2. Clone [Boiled](https://github.com/Hatched-Agency/boiled) into `wp-content/themes/acmecorp/`
3. Rename all `Boiled` / `boiled` placeholders to `Acme Corp` / `acmecorp`
4. Ask for brand colours (or use neutral defaults)
5. Apply colours to CSS custom properties in `assets/src/hatched.css`
6. Create a private GitHub repo and push initial commit (if GitHub configured)
7. Create `AGENTS.md` (and `CLAUDE.md` if AI = Claude) at the WordPress root
8. Start WordPress via `wp-now` in the background
9. Open VS Code at the WordPress root

---

### Update theme colours

```bash
synced theme "Acme Corp"
```

Updates brand colours and pushes a commit if GitHub is connected.

---

## Config file

`~/.synced/config.json`

```json
{
  "sitesPath": "~/Sites/Synced",
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
synced-hub/
├── package.json
├── bin/
│   └── synced.js          # CLI entry point
├── src/
│   ├── commands/
│   │   ├── new.js         # synced new "Client Name"
│   │   ├── theme.js       # synced theme "Client Name"
│   │   └── setup.js       # synced setup
│   ├── lib/
│   │   ├── config.js      # ~/.synced/config.json helpers
│   │   ├── github.js      # GitHub repo creation via @octokit/rest
│   │   ├── wordpress.js   # wp-now wrapper
│   │   ├── mysql.js       # MySQL stub (Phase 2)
│   │   ├── scaffold.js    # AI scaffolding stub (Phase 2)
│   │   └── boilerplate.js # Clone and configure Boiled theme
│   └── utils/
│       ├── logger.js      # Coloured console output
│       └── prompt.js      # Interactive prompts
└── README.md
```

---

## Boiled starter theme

[https://github.com/Hatched-Agency/boiled](https://github.com/Hatched-Agency/boiled)

Boiled is cloned and immediately de-gitted (`.git` removed) so it becomes a clean starting point owned by the client project. All `Boiled` / `boiled` references in `style.css`, `functions.php`, and `package.json` are replaced with the client name.

---

## Roadmap

- **Phase 2:** AI scaffolding (generate theme config from a brief using Claude/ChatGPT)
- **Phase 2:** Per-site MySQL instance management
- **Phase 2:** `synced list` — list all local sites
- **Phase 2:** `synced start / stop` — control wp-now instances
