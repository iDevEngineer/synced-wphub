import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { resolveSitesPath } from './config.js';

const SYNCED_DIR = join(homedir(), '.synced');
const RUNNING_FILE = join(SYNCED_DIR, 'running.json');

/**
 * Ensure the ~/.synced directory exists.
 */
function ensureSyncedDir() {
  if (!existsSync(SYNCED_DIR)) {
    mkdirSync(SYNCED_DIR, { recursive: true });
  }
}

/**
 * Read running.json — returns {} if file doesn't exist.
 * Shape: { "client-slug": { port, pid, url, name, startedAt } }
 */
export function getRunning() {
  if (!existsSync(RUNNING_FILE)) return {};
  try {
    const raw = readFileSync(RUNNING_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Write data to running.json.
 */
export function setRunning(data) {
  ensureSyncedDir();
  writeFileSync(RUNNING_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get a single site's running entry by slug. Returns null if not found.
 */
export function getSiteRunning(slug) {
  const running = getRunning();
  return running[slug] ?? null;
}

/**
 * Register (or update) a site in running.json.
 */
export function registerSite(slug, port, pid, url, name = null) {
  const running = getRunning();
  running[slug] = {
    port,
    pid,
    url,
    name,
    startedAt: new Date().toISOString(),
  };
  setRunning(running);
}

/**
 * Remove a site from running.json.
 */
export function unregisterSite(slug) {
  const running = getRunning();
  delete running[slug];
  setRunning(running);
}

/**
 * Find the next free port starting from 8881.
 * "Free" means not used by any currently registered running site.
 */
export function getNextPort() {
  const running = getRunning();
  const usedPorts = new Set(Object.values(running).map((s) => s.port));
  let port = 8881;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}

/**
 * List all site directories under config.sitesPath.
 * Returns an array of { slug, name, path }.
 * `name` is derived from the directory slug when not overrideable.
 */
export function getAllSites(config) {
  const sitesPath = resolveSitesPath(config.sitesPath);
  if (!existsSync(sitesPath)) return [];

  const entries = readdirSync(sitesPath);
  const sites = [];

  for (const entry of entries) {
    const fullPath = join(sitesPath, entry);
    try {
      if (statSync(fullPath).isDirectory()) {
        sites.push({
          slug: entry,
          name: slugToName(entry),
          path: fullPath,
        });
      }
    } catch {
      // skip unreadable entries
    }
  }

  return sites;
}

/**
 * Convert a slug to a display name.
 * "testsite" → "Testsite"
 * "test-site" → "Test Site"
 * "acmecorp" → "Acmecorp"
 */
function slugToName(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
