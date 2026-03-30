// Server-side wrappers for CLI config lib
// Direct CJS-compatible re-implementation to avoid ESM/CJS interop issues in Next.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.synced');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function readConfig(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read config: ${(err as Error).message}`);
  }
}

export function writeConfig(config: Record<string, unknown>): void {
  ensureConfigDir();
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write config: ${(err as Error).message}`);
  }
}

export function resolveSitesPath(sitesPath: string): string {
  if (sitesPath.startsWith('~/')) {
    return join(homedir(), sitesPath.slice(2));
  }
  return sitesPath;
}

export function getSitePath(config: Record<string, unknown>, clientName: string): string {
  const sitesPath = resolveSitesPath(config.sitesPath as string);
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return join(sitesPath, slug);
}
