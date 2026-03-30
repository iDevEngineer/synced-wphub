import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readConfig, getSitePath } from '../lib/config.js';
import { cloneStarterTheme, renameThemePlaceholders, applyBrandColours } from '../lib/boilerplate.js';
import { createRepo, initAndPush, getGitHubUser } from '../lib/github.js';
import { startWordPress } from '../lib/wordpress.js';
import { logger } from '../utils/logger.js';
import { confirm, input } from '../utils/prompt.js';
import { setupCommand } from './setup.js';
import { execa } from 'execa';


const DEFAULT_COLOURS = {
  primary: '#ffffff',
  secondary: '#1a1a1a',
  accent: '#6366f1',
};

/**
 * synced new "Client Name"
 *
 * Creates a new WordPress site using the Synced WP starter theme.
 */
export async function newCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced new "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // 1. Check config
  let config = readConfig();
  if (!config) {
    logger.warn('No configuration found. Running setup first...');
    logger.blank();
    await setupCommand();
    config = readConfig();
    if (!config) {
      logger.error('Setup did not complete. Aborting.');
      process.exit(1);
    }
  }

  logger.title(`Creating new site: ${clientName}`);
  logger.divider();

  const sitePath = getSitePath(config, clientName);

  // 2. Create site directory
  if (existsSync(sitePath)) {
    logger.error(`Site directory already exists: ${sitePath}`);
    process.exit(1);
  }

  logger.step(`Creating site directory: ${sitePath}`);
  mkdirSync(sitePath, { recursive: true });

  // 3. Download full WordPress core into site directory
  // This gives the dev wp-admin, wp-includes, wp-config.php — same as WordPress Studio.
  logger.step('Downloading WordPress...');
  try {
    await execa('curl', [
      '-fsSL',
      '-o', '/tmp/wordpress.tar.gz',
      'https://wordpress.org/latest.tar.gz',
    ]);
    logger.step('Extracting WordPress...');
    await execa('tar', ['-xzf', '/tmp/wordpress.tar.gz', '-C', '/tmp']);
    // tar extracts to /tmp/wordpress/ — move contents to sitePath
    await execa('rsync', ['-a', '/tmp/wordpress/', sitePath + '/']);
    await execa('rm', ['-rf', '/tmp/wordpress', '/tmp/wordpress.tar.gz']);
    logger.success('WordPress downloaded.');
  } catch (err) {
    logger.error(`Failed to download WordPress: ${err.message}`);
    process.exit(1);
  }

  const wpContentPath = join(sitePath, 'wp-content');
  const themesPath = join(wpContentPath, 'themes');
  const pluginsPath = join(wpContentPath, 'plugins');
  const themePath = join(themesPath, slug);
  mkdirSync(themesPath, { recursive: true });
  mkdirSync(pluginsPath, { recursive: true });

  // Remove bundled themes except twentytwentyfive (keep as safe fallback)
  logger.step('Removing unused default themes...');
  try {
    const { stdout } = await execa('ls', [themesPath]);
    const bundled = stdout.trim().split('\n').filter(t =>
      t.startsWith('twenty') && t !== 'twentytwentyfive'
    );
    for (const theme of bundled) {
      await execa('rm', ['-rf', join(themesPath, theme)]);
    }
    if (bundled.length) logger.success(`Removed: ${bundled.join(', ')}`);
  } catch {
    // non-fatal
  }

  // 4. Clone Synced WP theme
  try {
    await cloneStarterTheme(themePath);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // 6. Install theme dependencies
  logger.step('Installing theme dependencies...');
  try {
    await execa('npm', ['install', '--silent'], { cwd: themePath });
    logger.success('Theme dependencies installed.');
  } catch (err) {
    logger.warn(`Theme npm install failed: ${err.message}`);
  }

  // 7. Rename placeholders
  try {
    renameThemePlaceholders(themePath, clientName);
  } catch (err) {
    logger.warn(`Placeholder rename issue: ${err.message}`);
  }

  // 5. Brand colours
  const hasBrandColours = await confirm(
    'Do you have brand colours? (you can set them later with `synced theme`)',
    false
  );

  let colours = { ...DEFAULT_COLOURS };

  if (hasBrandColours) {
    const primary = await input('Primary colour (hex):', '#ffffff');
    const secondary = await input('Secondary colour (hex):', '#1a1a1a');
    const accent = await input('Accent colour (hex):', '#6366f1');
    colours = {
      primary: primary.trim() || DEFAULT_COLOURS.primary,
      secondary: secondary.trim() || DEFAULT_COLOURS.secondary,
      accent: accent.trim() || DEFAULT_COLOURS.accent,
    };
  } else {
    logger.info('Using neutral defaults — update any time with `synced theme "Client Name"`');
  }

  try {
    applyBrandColours(themePath, colours);
  } catch (err) {
    logger.warn(`Could not apply colours: ${err.message}`);
  }

  // 6. GitHub — use system credentials (gh CLI or GH_TOKEN), no stored token
  let repoUrl = null;
  try {
    const user = await getGitHubUser();
    const repoName = `synced-${slug}`;
    logger.step(`Creating private GitHub repo: ${user.login}/${repoName}`);
    const repo = await createRepo(repoName, `${clientName} WordPress site`);
    repoUrl = repo.ssh_url;
    logger.success(`Repo created: ${repo.html_url}`);
  } catch (err) {
    logger.warn(`GitHub: ${err.message}`);
    logger.info('Skipping repo creation — run `gh auth login` to enable.');
  }

  // 7. SYNCED.md
  const agentsMd = generateSyncedMd(clientName, slug, sitePath, colours);
  writeFileSync(join(sitePath, 'SYNCED.md'), agentsMd, 'utf8');
  logger.step('Created SYNCED.md');

  // 8. AGENTS.md + CLAUDE.md — always create both, just reference SYNCED.md
  writeFileSync(join(sitePath, 'AGENTS.md'), generateAgentsMd(), 'utf8');
  writeFileSync(join(sitePath, 'CLAUDE.md'), generateClaudeMd(), 'utf8');
  logger.step('Created AGENTS.md + CLAUDE.md');

  // 9. Git init and push
  if (repoUrl) {
    try {
      await initAndPush(sitePath, repoUrl);
    } catch (err) {
      logger.warn(`Git push failed: ${err.message}`);
    }
  }

  // 10. Start WordPress — pass blueprint to activate theme, reset to clear stale cache
  const blueprintPath = join(sitePath, 'blueprint.json');
  let localUrl = 'http://localhost:8881';
  try {
    localUrl = await startWordPress(sitePath, 8881, blueprintPath, true);
  } catch (err) {
    logger.warn(`WordPress start failed: ${err.message}`);
    logger.info('Start manually: npx @wp-now/wp-now start --path=' + sitePath);
  }

  // 11. Open VS Code
  try {
    logger.step('Opening VS Code...');
    execa('code', [sitePath], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    logger.warn('VS Code not found in PATH — open manually: code ' + sitePath);
  }

  // Success summary
  logger.blank();
  logger.divider();
  logger.success(`${clientName} is ready!`);
  logger.blank();
  logger.info(`  Site path:  ${sitePath}`);
  logger.info(`  Theme:      wp-content/themes/${slug}/`);
  logger.info(`  Local URL:  ${localUrl}`);
  if (repoUrl) {
    logger.info(`  GitHub:     ${repoUrl}`);
  }
  logger.blank();
  logger.info('Run `synced theme "' + clientName + '"` to update brand colours.');
  logger.divider();
}

// ─── Template generators ─────────────────────────────────────────────────────

function generateSyncedMd(clientName, slug, sitePath, colours) {
  return `# SYNCED.md — ${clientName}

## IMPORTANT: WordPress Environment

This site runs via **wp-now** (WordPress Playground / PHP WASM). Standard \`wp\` CLI commands will NOT work — use \`npx @wp-now/wp-now\` to manage the site.

### Site lifecycle
\`\`\`bash
# Start WordPress
npx @wp-now/wp-now start --path=${sitePath} --skip-browser

# Stop WordPress
npx @wp-now/wp-now stop --path=${sitePath}
\`\`\`

### Theme development
\`\`\`bash
# Watch for changes
cd wp-content/themes/${slug}
npm run dev

# Build for production
npm run build
\`\`\`

---

## Stack

| | |
|---|---|
| CMS | WordPress (latest, via wp-now) |
| Database | SQLite (no MySQL required) |
| Theme | ${clientName} (${slug}) |
| Build tool | Vite |
| CSS | Tailwind v4 |
| JS | ES modules |

## Brand Colours

- Primary:   \`${colours.primary}\`
- Secondary: \`${colours.secondary}\`
- Accent:    \`${colours.accent}\`

Edit: \`wp-content/themes/${slug}/assets/src/css/variables.css\`

---

## File Structure

\`\`\`
${sitePath}/
├── wp-admin/              ← WordPress admin (do not edit)
├── wp-includes/           ← WordPress core (do not edit)
├── wp-content/
│   ├── themes/
│   │   └── ${slug}/       ← YOUR THEME — work here
│   │       ├── assets/src/css/variables.css  ← brand colours
│   │       ├── assets/src/css/main.css       ← main styles
│   │       ├── assets/src/js/main.js         ← main JS
│   │       ├── style.css                     ← theme header
│   │       ├── functions.php                 ← theme functions
│   │       ├── index.php                     ← homepage template
│   │       └── vite.config.js                ← build config
│   ├── plugins/           ← install plugins here
│   ├── mu-plugins/        ← must-use plugins (SQLite integration lives here)
│   └── database/          ← SQLite database files (do not delete)
├── wp-config.php          ← WordPress config (managed by wp-now)
└── blueprint.json         ← wp-now startup config
\`\`\`

---

## Database: SQLite

This site uses **SQLite** — there is no MySQL server.

**Rules:**
- Never reference \`DB_NAME\`, \`DB_HOST\`, \`DB_USER\`, \`DB_PASSWORD\` — they are not defined
- Never delete \`wp-content/db.php\` — it is the SQLite drop-in
- Never delete \`wp-content/mu-plugins/sqlite-*\` — required for the database to work
- Use \`$wpdb->prepare()\` for all queries with dynamic values
- No \`FULLTEXT\` index support — use a search plugin if needed
- No stored procedures

---

## WordPress Development Rules

| Don't | Do instead |
|-------|-----------|
| Edit \`wp-includes/\` or \`wp-admin/\` | Use actions/filters/child themes |
| Hardcode URLs or ports | Use \`get_site_url()\` or \`home_url()\` |
| Use \`wp shell\` | Use \`wp eval\` via wp-now |
| Build classic themes | Build block themes with \`theme.json\` |
| Direct database queries | Use \`$wpdb\` with \`prepare()\` |

**Always sanitize input and escape output:**
- Sanitize: \`sanitize_text_field()\`, \`absint()\`, \`wp_kses_post()\`
- Escape: \`esc_html()\`, \`esc_attr()\`, \`esc_url()\`

**Use hooks, not direct edits:**
\`\`\`php
// Correct
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('${slug}-style', get_stylesheet_uri());
});

// Wrong — never edit wp-includes/ or wp-admin/
\`\`\`

---

## Common Tasks

**Activate a plugin:**
\`\`\`bash
# Install and activate via WP-CLI (requires PHP on host machine)
wp plugin install woocommerce --activate --path=${sitePath}
# Or install manually: download to wp-content/plugins/ and activate via WP Admin
\`\`\`

**WP Admin:**
- URL: http://localhost:8881/wp-admin
- Credentials: set during first run (default: admin / password)

**Debug logging:**
Add to \`wp-config.php\`:
\`\`\`php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
\`\`\`
Then check: \`wp-content/debug.log\`

---

## Synced Hub Commands

\`\`\`bash
synced theme "${clientName}"   # Update brand colours
\`\`\`

---

*Scaffolded by Synced Hub. Update brand colours any time with \`synced theme "${clientName}"\`.*
`;
}

function generateAgentsMd() {
  return `# AI Instructions

This is a local WordPress site managed by [Synced](https://synced.agency).
For full environment instructions, see @SYNCED.md

> **Customising this file:** Feel free to edit, extend, or replace the contents below.
`;
}

function generateClaudeMd() {
  return `@AGENTS.md
`;
}
