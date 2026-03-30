import { execa } from 'execa';
import { join } from 'path';
import { logger } from '../../utils/logger.js';

const WPE_SSH_GATEWAY = 'ssh.wpengine.net';

/**
 * WP Engine adapter.
 *
 * WP Engine uses a custom SSH gateway. The sitename is part of the SSH user.
 * SSH user format: sitename (matches the WP Engine install name)
 * Remote path: sitename/wp-content/themes/<slug>/
 *
 * 1. rsync to WP Engine SSH gateway
 * 2. SSH cache flush via wp cli on the gateway
 */
export async function deploy(config, sitePath, slug) {
  const { sshUser, wpPath } = config;
  // WP Engine: sshUser is the install/site name
  const siteName = sshUser;
  const localThemePath = join(sitePath, 'wp-content', 'themes', slug) + '/';
  const remoteThemePath = `${siteName}@${WPE_SSH_GATEWAY}:${siteName}/wp-content/themes/${slug}/`;

  logger.step(`Syncing theme files to WP Engine (${siteName})...`);
  try {
    await execa('rsync', [
      '-avz',
      '--delete',
      '-e', 'ssh -o StrictHostKeyChecking=accept-new',
      localThemePath,
      remoteThemePath,
    ], { stdio: 'inherit' });
    logger.success('Theme files synced to WP Engine.');
  } catch (err) {
    throw new Error(`WP Engine rsync failed: ${err.message}`);
  }

  logger.step('Flushing WordPress cache on WP Engine...');
  try {
    await execa('ssh', [
      '-o', 'StrictHostKeyChecking=accept-new',
      `${siteName}@${WPE_SSH_GATEWAY}`,
      `wp cache flush --path=${wpPath || `/sites/${siteName}`}`,
    ], { stdio: 'inherit' });
    logger.success('Cache flushed.');
  } catch (err) {
    logger.warn(`WP Engine cache flush failed (non-fatal): ${err.message}`);
  }
}
