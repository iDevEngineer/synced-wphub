import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync } from 'fs';
import { execa } from 'execa';

function getConfig() {
  try { return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8')); }
  catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getWpCli(): string {
  const local = path.join(homedir(), '.local', 'bin', 'wp');
  try { readFileSync(local); return local; } catch { return 'wp'; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;
    const sitePath = path.join(sitesPath, match);
    const wp = getWpCli();

    const [wpVersion, phpVersion] = await Promise.all([
      execa(wp, ['core', 'version', `--path=${sitePath}`, '--allow-root'])
        .then(r => r.stdout.trim())
        .catch(() => 'Unknown'),
      execa(wp, ['eval', 'echo PHP_VERSION;', `--path=${sitePath}`, '--allow-root'])
        .then(r => r.stdout.trim())
        .catch(() => 'Unknown'),
    ]);

    return Response.json({ wpVersion, phpVersion });
  } catch {
    return Response.json({ wpVersion: 'Unknown', phpVersion: 'Unknown' });
  }
}
