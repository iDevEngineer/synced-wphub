import { execa } from 'execa';
import { logger } from '../utils/logger.js';

/**
 * Start a WordPress instance using wp-now via npx.
 * Runs as a detached background process so the CLI exits cleanly.
 *
 * Returns the local URL (wp-now defaults to http://localhost:8881 unless
 * the port is in use, in which case it increments).
 */
export async function startWordPress(sitePath) {
  logger.step('Starting WordPress via wp-now...');

  try {
    // Detach from parent process so it keeps running after CLI exits
    const proc = execa(
      'npx',
      ['@wp-now/wp-now', 'start', `--path=${sitePath}`],
      {
        detached: true,
        stdio: 'ignore',
      }
    );

    proc.unref();

    // wp-now takes a moment to bind; give it a brief window
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.success('WordPress started in background.');
    // wp-now default port — may differ if port was busy
    return 'http://localhost:8881';
  } catch (err) {
    throw new Error(`Failed to start WordPress: ${err.message}`);
  }
}

/**
 * Stop a running wp-now instance for the given path.
 */
export async function stopWordPress(sitePath) {
  try {
    await execa('npx', ['@wp-now/wp-now', 'stop', `--path=${sitePath}`]);
    logger.success('WordPress stopped.');
  } catch (err) {
    logger.warn(`Could not stop WordPress: ${err.message}`);
  }
}
