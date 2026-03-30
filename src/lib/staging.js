import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SITES_DIR = join(homedir(), '.synced', 'sites');

/**
 * Ensure sites directory exists
 */
function ensureSitesDir() {
  if (!existsSync(SITES_DIR)) {
    mkdirSync(SITES_DIR, { recursive: true });
  }
}

/**
 * Get path to staging config for a given slug
 */
function stagingConfigPath(slug) {
  return join(SITES_DIR, `${slug}.json`);
}

/**
 * Check if staging config exists for a slug
 */
export function stagingConfigExists(slug) {
  return existsSync(stagingConfigPath(slug));
}

/**
 * Read staging config for a slug
 * Returns null if not found
 *
 * Config shape:
 * {
 *   slug,
 *   provider,     // 'generic' | 'wpengine' | 'kinsta' | 'dokploy'
 *   sshHost,      // staging.clientsite.com
 *   sshUser,      // deploy
 *   wpPath,       // /var/www/html
 *   themePath,    // /var/www/html/wp-content/themes/<slug>
 *   stagingUrl,   // https://staging.clientsite.com
 *   githubRepo,   // owner/repo (set when deploy first runs)
 * }
 */
export function readStagingConfig(slug) {
  const configPath = stagingConfigPath(slug);
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read staging config for ${slug}: ${err.message}`);
  }
}

/**
 * Write staging config for a slug
 */
export function writeStagingConfig(slug, config) {
  ensureSitesDir();
  const configPath = stagingConfigPath(slug);
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write staging config for ${slug}: ${err.message}`);
  }
}
