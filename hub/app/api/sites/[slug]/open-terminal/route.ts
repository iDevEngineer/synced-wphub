import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { execa } from 'execa';

function getConfig() {
  try { return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8')); }
  catch { return {}; }
}
function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const TERMINAL_APPS: Record<string, string> = {
  terminal: 'Terminal',
  iterm2: 'iTerm',
  warp: 'Warp',
  ghostty: 'Ghostty',
  hyper: 'Hyper',
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const dirs = readdirSync(sitesPath);
    const match = dirs.find(d => toSlug(d) === slug) ?? slug;
    const sitePath = path.join(sitesPath, match);
    // Prefer stored app name, fall back to id lookup
    const appName = config.terminalApp ?? TERMINAL_APPS[config.terminal ?? ''] ?? 'Terminal';
    // Use AppleScript to open terminal at path
    const script = `tell application "${appName}" to activate\ntell application "System Events" to keystroke "t" using {command down}`;
    try {
      await execa('open', ['-a', appName, sitePath]);
    } catch {
      // Fallback: just open the app
      await execa('open', ['-a', appName]);
    }
    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed to open terminal.' }, { status: 500 });
  }
}
