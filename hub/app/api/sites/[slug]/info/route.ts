import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';

function getConfig() {
  try { return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8')); }
  catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function readSiteConfig(slug: string) {
  try {
    return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'sites', `${slug}.json`), 'utf-8'));
  } catch { return {}; }
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

    const siteConfig = readSiteConfig(toSlug(match));

    // Read WP version from wp-includes/version.php if available
    const sitePath = path.join(sitesPath, match);
    let wpVersion = siteConfig.wpVersion ?? 'Latest';
    const versionFile = path.join(sitePath, 'wp-includes', 'version.php');
    if (existsSync(versionFile)) {
      const content = readFileSync(versionFile, 'utf-8');
      const m = content.match(/\$wp_version\s*=\s*'([^']+)'/);
      if (m) wpVersion = m[1];
    }

    const phpVersion = siteConfig.phpVersion ?? '8.0 (default)';

    return Response.json({ wpVersion, phpVersion });
  } catch {
    return Response.json({ wpVersion: 'Unknown', phpVersion: 'Unknown' });
  }
}
