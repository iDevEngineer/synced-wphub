// Server-side wrappers for CLI sites lib
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { resolveSitesPath } from './config-server';

const SYNCED_DIR = join(homedir(), '.synced');
const RUNNING_FILE = join(SYNCED_DIR, 'running.json');

function ensureSyncedDir() {
  if (!existsSync(SYNCED_DIR)) {
    mkdirSync(SYNCED_DIR, { recursive: true });
  }
}

export interface RunningEntry {
  port: number;
  pid: number;
  url: string;
  name: string | null;
  startedAt: string;
}

export function getRunning(): Record<string, RunningEntry> {
  if (!existsSync(RUNNING_FILE)) return {};
  try {
    const raw = readFileSync(RUNNING_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setRunning(data: Record<string, RunningEntry>): void {
  ensureSyncedDir();
  writeFileSync(RUNNING_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function getSiteRunning(slug: string): RunningEntry | null {
  const running = getRunning();
  return running[slug] ?? null;
}

export function registerSite(slug: string, port: number, pid: number, url: string, name: string | null = null): void {
  const running = getRunning();
  running[slug] = { port, pid, url, name, startedAt: new Date().toISOString() };
  setRunning(running);
}

export function unregisterSite(slug: string): void {
  const running = getRunning();
  delete running[slug];
  setRunning(running);
}

export function getNextPort(): number {
  const running = getRunning();
  const usedPorts = new Set(Object.values(running).map((s) => s.port));
  let port = 8881;
  while (usedPorts.has(port)) port++;
  return port;
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface SiteEntry {
  slug: string;
  name: string;
  path: string;
}

export function getAllSites(config: Record<string, unknown>): SiteEntry[] {
  const sitesPath = resolveSitesPath(config.sitesPath as string);
  if (!existsSync(sitesPath)) return [];

  const entries = readdirSync(sitesPath);
  const sites: SiteEntry[] = [];

  for (const entry of entries) {
    const fullPath = join(sitesPath, entry);
    try {
      if (statSync(fullPath).isDirectory()) {
        sites.push({ slug: entry, name: slugToName(entry), path: fullPath });
      }
    } catch {
      // skip
    }
  }

  return sites;
}
