import { existsSync } from 'fs';
import { join } from 'path';
import { readConfig, getSitePath } from '../lib/config.js';
import { applyBrandColours } from '../lib/boilerplate.js';
import { commitAndPush } from '../lib/github.js';
import { logger } from '../utils/logger.js';
import { input, select } from '../utils/prompt.js';

const DEFAULT_COLOURS = {
  primary: '#ffffff',
  secondary: '#1a1a1a',
  accent: '#6366f1',
};

/**
 * synced theme "Client Name"
 *
 * Update theme configuration for an existing site.
 */
export async function themeCommand(clientName) {
  if (!clientName || !clientName.trim()) {
    logger.error('Please provide a client name: synced theme "Client Name"');
    process.exit(1);
  }

  clientName = clientName.trim();
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Load config
  const config = readConfig();
  if (!config) {
    logger.error('No Synced config found. Run `synced setup` first.');
    process.exit(1);
  }

  const sitePath = getSitePath(config, clientName);

  // 1. Find site
  if (!existsSync(sitePath)) {
    logger.error(`Site not found: ${sitePath}`);
    logger.info(`Run \`synced new "${clientName}"\` to create it first.`);
    process.exit(1);
  }

  const themePath = join(sitePath, 'wp-content', 'themes', slug);
  if (!existsSync(themePath)) {
    logger.error(`Theme directory not found: ${themePath}`);
    process.exit(1);
  }

  logger.title(`Updating theme: ${clientName}`);
  logger.divider();

  // 2. Colours
  logger.info('Enter your brand colours (press Enter to keep current / use defaults):');
  const primary = await input('Primary colour (hex):', DEFAULT_COLOURS.primary);
  const secondary = await input('Secondary colour (hex):', DEFAULT_COLOURS.secondary);
  const accent = await input('Accent colour (hex):', DEFAULT_COLOURS.accent);

  const colours = {
    primary: primary.trim() || DEFAULT_COLOURS.primary,
    secondary: secondary.trim() || DEFAULT_COLOURS.secondary,
    accent: accent.trim() || DEFAULT_COLOURS.accent,
  };

  // 3. Font style (stored as a comment for now; Phase 2 will apply it)
  const fontStyle = await select('Font style preference:', [
    { name: 'system', message: 'System stack (fast, no external requests)' },
    { name: 'serif', message: 'Serif (editorial, trustworthy)' },
    { name: 'sans', message: 'Sans-serif (clean, modern)' },
    { name: 'custom', message: 'Custom (specify in theme manually)' },
  ]);

  logger.info(`Font style "${fontStyle}" noted — apply manually in Phase 2.`);

  // 4. Apply colours
  try {
    applyBrandColours(themePath, colours);
  } catch (err) {
    logger.error(`Failed to apply colours: ${err.message}`);
    process.exit(1);
  }

  // 5. Commit and push if GitHub connected
  if (config.github?.connected) {
    try {
      await commitAndPush(sitePath, `style: update brand colours for ${clientName}`);
    } catch (err) {
      logger.warn(`Could not push to GitHub: ${err.message}`);
    }
  }

  logger.blank();
  logger.success('Theme updated!');
  logger.info(`  Primary:   ${colours.primary}`);
  logger.info(`  Secondary: ${colours.secondary}`);
  logger.info(`  Accent:    ${colours.accent}`);
  logger.blank();
}
