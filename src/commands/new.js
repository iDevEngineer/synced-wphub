import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readConfig, getSitePath } from '../lib/config.js';
import { cloneBoiled, renameBoiledPlaceholders, applyBrandColours } from '../lib/boilerplate.js';
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
 * Creates a new WordPress site with the Boiled starter theme.
 */
export async function newCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced new "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');

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

  // WordPress wp-content/themes directory
  const themesPath = join(sitePath, 'wp-content', 'themes');
  const themePath = join(themesPath, slug);
  mkdirSync(themesPath, { recursive: true });

  // 3. Clone Boiled
  try {
    await cloneBoiled(themePath);
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  // 4. Rename placeholders
  try {
    renameBoiledPlaceholders(themePath, clientName);
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

  // 6. GitHub
  let repoUrl = null;
  if (config.github?.connected) {
    try {
      const user = await getGitHubUser(config);
      const repoName = `synced-${slug}`;
      logger.step(`Creating private GitHub repo: ${user.login}/${repoName}`);
      const repo = await createRepo(config, repoName, `${clientName} WordPress site`);
      repoUrl = repo.ssh_url;
      logger.success(`Repo created: ${repo.html_url}`);
    } catch (err) {
      logger.warn(`GitHub repo creation failed: ${err.message}`);
    }
  }

  // 7. AGENTS.md
  const agentsMd = generateAgentsMd(clientName, slug, sitePath, colours);
  writeFileSync(join(sitePath, 'AGENTS.md'), agentsMd, 'utf8');
  logger.step('Created AGENTS.md');

  // 8. CLAUDE.md (if AI = claude)
  if (config.ai === 'claude') {
    const claudeMd = generateClaudeMd(clientName, slug, sitePath);
    writeFileSync(join(sitePath, 'CLAUDE.md'), claudeMd, 'utf8');
    logger.step('Created CLAUDE.md');
  }

  // 9. Git init and push
  if (repoUrl) {
    try {
      await initAndPush(sitePath, repoUrl);
    } catch (err) {
      logger.warn(`Git push failed: ${err.message}`);
    }
  }

  // 10. Start WordPress
  let localUrl = 'http://localhost:8881';
  try {
    localUrl = await startWordPress(sitePath);
  } catch (err) {
    logger.warn(`WordPress start failed: ${err.message}`);
    logger.info('You can start it manually: npx @wp-now/wp-now start --path=' + sitePath);
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

function generateAgentsMd(clientName, slug, sitePath, colours) {
  return `# AGENTS.md — ${clientName}

## Stack

- **CMS:** WordPress (via wp-now)
- **Theme:** ${clientName} (Boiled starter)
- **Theme path:** wp-content/themes/${slug}/
- **Build tool:** Vite (check theme package.json)
- **CSS:** Custom properties in assets/src/hatched.css

## Brand Colours

- Primary:   ${colours.primary}
- Secondary: ${colours.secondary}
- Accent:    ${colours.accent}

## Local Development

\`\`\`bash
# Start WordPress
npx @wp-now/wp-now start --path=${sitePath}

# Install theme dependencies
cd wp-content/themes/${slug}
npm install

# Watch for changes
npm run dev
\`\`\`

## Notes

- This site was scaffolded by Synced Hub
- Run \`synced theme "${clientName}"\` to update brand settings
`;
}

function generateClaudeMd(clientName, slug, sitePath) {
  return `# CLAUDE.md — ${clientName}

## Project Context

This is a WordPress site for **${clientName}**, scaffolded by Synced Hub.

## Theme

- **Name:** ${clientName}
- **Path:** \`wp-content/themes/${slug}/\`
- **Base:** Boiled starter theme by Hatched Agency
- **CSS variables:** \`wp-content/themes/${slug}/assets/src/hatched.css\`

## Working with this project

- Theme files are in \`wp-content/themes/${slug}/\`
- CSS custom properties control colours — edit \`assets/src/hatched.css\`
- Run \`npm run dev\` in the theme directory to watch for asset changes
- WordPress runs locally via \`npx @wp-now/wp-now start --path=${sitePath}\`

## Conventions

- PHP: WordPress coding standards
- CSS: Custom properties, BEM class naming
- JS: ES modules, minimal framework use
`;
}
