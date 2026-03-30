// Server-side wrappers for CLI staging lib
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SITES_DIR = join(homedir(), '.synced', 'sites');

function ensureSitesDir() {
  if (!existsSync(SITES_DIR)) {
    mkdirSync(SITES_DIR, { recursive: true });
  }
}

function stagingConfigPath(slug: string): string {
  return join(SITES_DIR, `${slug}.json`);
}

export function stagingConfigExists(slug: string): boolean {
  return existsSync(stagingConfigPath(slug));
}

export interface StagingConfig {
  slug: string;
  provider: string;
  sshHost: string;
  sshUser: string;
  wpPath: string;
  themePath: string;
  stagingUrl: string;
  githubRepo?: string;
  dokployUrl?: string;
  dokployToken?: string;
  dokployAppId?: string;
  kinstaApiKey?: string;
  kinstaSiteId?: string;
}

export function readStagingConfig(slug: string): StagingConfig | null {
  const configPath = stagingConfigPath(slug);
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read staging config for ${slug}: ${(err as Error).message}`);
  }
}

export function writeStagingConfig(slug: string, config: StagingConfig): void {
  ensureSitesDir();
  const configPath = stagingConfigPath(slug);
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    throw new Error(`Failed to write staging config for ${slug}: ${(err as Error).message}`);
  }
}
