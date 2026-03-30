import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

export async function uninstallCommand(options = {}) {
  logger.title('Synced WP — Uninstall');
  logger.divider();
  logger.blank();

  const home = homedir();
  const configDir = join(home, '.synced');
  const cacheDir = join(home, '.wp-now');
  const sitesDir = join(home, 'Synced-Sites');

  // 1. Remove config
  logger.step('Removing config...');
  if (existsSync(configDir)) {
    rmSync(configDir, { recursive: true, force: true });
    logger.success('Config removed (~/.synced).');
  } else {
    logger.info('Config not found — skipping.');
  }

  // 2. Clear wp-now cache
  logger.step('Clearing wp-now cache...');
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
    logger.success('wp-now cache cleared (~/.wp-now).');
  } else {
    logger.info('wp-now cache not found — skipping.');
  }

  // 3. Remove sites if --sites flag passed
  const removeSites = options.sites === true;
  if (removeSites) {
    logger.step('Removing sites...');
    if (existsSync(sitesDir)) {
      rmSync(sitesDir, { recursive: true, force: true });
      logger.success('Sites removed (~/Synced-Sites).');
    } else {
      logger.info('No sites directory found — skipping.');
    }
  } else {
    logger.info('Keeping ~/Synced-Sites. Run `synced uninstall --sites` to remove them too.');
  }

  logger.blank();
  logger.success('Synced WP uninstalled.');
  logger.blank();
  logger.info('To reinstall: curl -fsSL https://synced.agency/install/wp | bash');
  logger.blank();

  // Self-destruct last — remove install dir after everything else is done
  logger.step('Removing CLI install...');
  const installDir = join(home, '.synced-wphub');
  if (existsSync(installDir)) {
    // Use setTimeout to allow process to finish logging before deletion
    setTimeout(() => {
      rmSync(installDir, { recursive: true, force: true });
    }, 500);
    logger.success('CLI removed (~/.synced-wphub).');
  }
}
