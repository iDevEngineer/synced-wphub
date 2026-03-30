import { execa } from 'execa';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { logger } from '../utils/logger.js';

/**
 * Resolve the path to the wp-now binary bundled with synced-hub.
 */
function getWpNowBin() {
  const require = createRequire(import.meta.url);
  try {
    // Resolve from the package root
    const pkgPath = require.resolve('@wp-now/wp-now/package.json');
    const pkgDir = pkgPath.replace('/package.json', '');
    const bin = join(pkgDir, 'wp-now.js');
    if (existsSync(bin)) return bin;
  } catch {
    // fall through to npx fallback
  }
  return null;
}

/**
 * Start a WordPress instance using wp-now.
 * Uses `wordpress` mode — requires a full WP directory.
 * Runs as a detached background process so the CLI exits cleanly.
 *
 * Returns the local URL.
 */
export async function startWordPress(sitePath, port = 8881) {
  logger.step('Starting WordPress...');

  const wpNowBin = getWpNowBin();
  const args = ['start', `--path=${sitePath}`, `--port=${port}`, '--skip-browser'];

  try {
    let proc;
    if (wpNowBin) {
      proc = execa('node', [wpNowBin, ...args], {
        detached: true,
        stdio: 'ignore',
      });
    } else {
      // Fallback to npx if local binary not found
      proc = execa('npx', ['@wp-now/wp-now', ...args], {
        detached: true,
        stdio: 'ignore',
      });
    }

    proc.unref();

    // Give wp-now a moment to bind
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const url = `http://localhost:${port}`;
    logger.success(`WordPress running at ${url}`);
    return url;
  } catch (err) {
    throw new Error(`Failed to start WordPress: ${err.message}`);
  }
}

/**
 * Stop a running wp-now instance for the given path.
 */
export async function stopWordPress(sitePath) {
  const wpNowBin = getWpNowBin();
  try {
    if (wpNowBin) {
      await execa('node', [wpNowBin, 'stop', `--path=${sitePath}`]);
    } else {
      await execa('npx', ['@wp-now/wp-now', 'stop', `--path=${sitePath}`]);
    }
    logger.success('WordPress stopped.');
  } catch (err) {
    logger.warn(`Could not stop WordPress: ${err.message}`);
  }
}
