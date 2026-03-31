import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';

function getConfig() {
  try {
    return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8'));
  } catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;
    const sitePath = path.join(sitesPath, match);
    const themesPath = path.join(sitePath, 'wp-content', 'themes');

    // Find first theme that has a screenshot.png
    let screenshotPath: string | null = null;
    if (existsSync(themesPath)) {
      const themes = readdirSync(themesPath);
      for (const theme of themes) {
        const candidate = path.join(themesPath, theme, 'screenshot.png');
        if (existsSync(candidate)) {
          screenshotPath = candidate;
          break;
        }
      }
    }

    if (!screenshotPath) {
      return new Response(null, { status: 404 });
    }

    const img = readFileSync(screenshotPath);
    return new Response(img, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
