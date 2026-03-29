import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.synced');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Check if config file exists
 */
export function configExists() {
  return existsSync(CONFIG_FILE);
}

/**
 * Read config from ~/.synced/config.json
 * Returns null if config doesn't exist
 */
export function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read config: ${err.message}`);
  }
}

/**
 * Write config to ~/.synced/config.json
 */
export function writeConfig(config) {
  ensureConfigDir();
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write config: ${err.message}`);
  }
}

/**
 * Get the sites path, resolving ~ to home directory
 */
export function resolveSitesPath(sitesPath) {
  if (sitesPath.startsWith('~/')) {
    return join(homedir(), sitesPath.slice(2));
  }
  return sitesPath;
}

/**
 * Get path for a specific site
 */
export function getSitePath(config, clientName) {
  const sitesPath = resolveSitesPath(config.sitesPath);
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return join(sitesPath, slug);
}

export { CONFIG_FILE, CONFIG_DIR };
