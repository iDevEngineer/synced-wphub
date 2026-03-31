import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync } from 'fs';
import { execa } from 'execa';

function getConfig() {
  try {
    return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8'));
  } catch { return {}; }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find((d: string) => toSlug(d) === params.slug) ?? params.slug;
    const sitePath = path.join(sitesPath, match);

    // Config stores the app name directly (e.g. "Visual Studio Code", "Cursor", "Antigravity")
    const appName: string = config.codeEditorApp ?? config.codeEditor ?? '';

    try {
      if (appName) {
        await execa('open', ['-a', appName, sitePath]);
      } else {
        await execa('open', [sitePath]);
      }
    } catch {
      await execa('open', [sitePath]);
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to open editor.' }, { status: 500 });
  }
}
