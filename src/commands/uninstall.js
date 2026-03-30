import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';
import { logger } from '../utils/logger.js';
import { confirm } from '../utils/prompt.js';

export async function uninstallCommand() {
  logger.title('Synced WP — Uninstall');
  logger.divider();
  logger.blank();

  const home = homedir();
  const installDir = join(home, '.synced-wphub');
  const configDir = join(home, '.synced');
  const cacheDir = join(home, '.wp-now');
  const sitesDir = join(home, 'Synced-Sites');

  // 1. Unlink and remove CLI
  logger.step('Removing CLI...');
  if (existsSync(installDir)) {
    try {
      await execa('npm', ['unlink', '--silent'], { cwd: installDir }).catch(() => {});
      rmSync(installDir, { recursive: true, force: true });
      logger.success('CLI removed.');
    } catch (err) {
      logger.warn(`Could not remove CLI: ${err.message}`);
    }
  } else {
    logger.info('CLI not found — skipping.');
  }

  // 2. Remove config
  logger.step('Removing config...');
  if (existsSync(configDir)) {
    rmSync(configDir, { recursive: true, force: true });
    logger.success('Config removed.');
  } else {
    logger.info('Config not found — skipping.');
  }

  // 3. Clear wp-now cache
  logger.step('Clearing wp-now cache...');
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
    logger.success('wp-now cache cleared.');
  } else {
    logger.info('wp-now cache not found — skipping.');
  }

  // 4. Optionally remove sites
  logger.blank();
  if (existsSync(sitesDir)) {
    const removeSites = await confirm('Remove ~/Synced-Sites and all local sites?', false);
    if (removeSites) {
      rmSync(sitesDir, { recursive: true, force: true });
      logger.success('Sites removed.');
    } else {
      logger.info('Keeping ~/Synced-Sites.');
    }
  }

  logger.blank();
  logger.success('Synced WP uninstalled.');
  logger.blank();
  logger.info('To reinstall: curl -fsSL https://synced.agency/install/wp | bash');
}
