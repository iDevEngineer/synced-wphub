import chalk from 'chalk';
import { readConfig } from '../lib/config.js';
import { getAllSites, getRunning } from '../lib/sites.js';
import { logger } from '../utils/logger.js';

/**
 * synced list
 *
 * Lists all local sites and their running status.
 */
export async function listCommand() {
  // 1. Read config
  const config = readConfig();
  if (!config) {
    logger.error('No configuration found. Run `synced setup` first.');
    process.exit(1);
  }

  // 2. Read all site directories and running registry
  const sites = getAllSites(config);
  const running = getRunning();

  // 3. Print table
  logger.blank();
  logger.title('Synced Sites');
  logger.divider();

  if (sites.length === 0) {
    logger.info('No sites found. Create one with `synced new "Client Name"`.');
    logger.divider();
    return;
  }

  // Calculate column width for name alignment
  const maxNameLen = Math.max(...sites.map((s) => s.name.length), 12);

  for (const site of sites) {
    const entry = running[site.slug];
    const isRunning = !!entry;

    const name = site.name.padEnd(maxNameLen);
    const status = isRunning
      ? chalk.green('running ')
      : chalk.dim('stopped ');
    const url = isRunning ? chalk.cyan(entry.url) : chalk.dim('–');

    console.log(`  ${chalk.white(name)}  ${status}  ${url}`);
  }

  logger.divider();
  logger.blank();
}
