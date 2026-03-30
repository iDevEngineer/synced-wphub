import { execa } from 'execa';
import { join } from 'path';
import { logger } from '../../utils/logger.js';

/**
 * Generic SSH deploy — works on any host with SSH key auth.
 *
 * 1. rsync theme files to staging
 * 2. WP-CLI cache flush on staging via SSH
 */
export async function deploy(config, sitePath, slug) {
  const { sshUser, sshHost, themePath, wpPath } = config;
  const localThemePath = join(sitePath, 'wp-content', 'themes', slug) + '/';
  const remoteThemePath = `${sshUser}@${sshHost}:${themePath}/`;

  logger.step(`Syncing theme files to ${sshHost}...`);
  try {
    await execa('rsync', [
      '-avz',
      '--delete',
      '-e', 'ssh -o StrictHostKeyChecking=accept-new',
      localThemePath,
      remoteThemePath,
    ], { stdio: 'inherit' });
    logger.success('Theme files synced.');
  } catch (err) {
    throw new Error(`rsync failed: ${err.message}`);
  }

  logger.step('Flushing WordPress cache on staging...');
  try {
    await execa('ssh', [
      '-o', 'StrictHostKeyChecking=accept-new',
      `${sshUser}@${sshHost}`,
      `wp cache flush --path=${wpPath}`,
    ], { stdio: 'inherit' });
    logger.success('Cache flushed.');
  } catch (err) {
    // Cache flush failure is non-fatal — warn and continue
    logger.warn(`Cache flush failed (non-fatal): ${err.message}`);
  }
}
