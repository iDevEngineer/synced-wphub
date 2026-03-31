import { NextRequest } from 'next/server';
import { homedir } from 'os';
import path from 'path';
import { readFileSync } from 'fs';
import { execa } from 'execa';

function getConfig() {
  try {
    return JSON.parse(readFileSync(path.join(homedir(), '.synced', 'config.json'), 'utf-8'));
  } catch {
    return { sitesPath: path.join(homedir(), 'Synced-Sites') };
  }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function openInEditor(editor: string, sitePath: string) {
  switch (editor) {
    case 'vscode':
      return execa('code', [sitePath]);
    case 'cursor':
      return execa('cursor', [sitePath]);
    case 'zed':
      return execa('zed', [sitePath]);
    case 'phpstorm':
      return execa('open', ['-a', 'PhpStorm', sitePath]);
    case 'sublime':
      return execa('subl', [sitePath]);
    default:
      return execa('open', [sitePath]);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const config = getConfig();
    const sitesPath = (config.sitesPath ?? path.join(homedir(), 'Synced-Sites')).replace(/^~/, homedir());
    const { readdirSync } = await import('fs');
    const dirs = readdirSync(sitesPath);
    const match = dirs.find((d: string) => toSlug(d) === params.slug) ?? params.slug;
    const sitePath = path.join(sitesPath, match);

    const editor: string = config.codeEditor ?? '';

    try {
      await openInEditor(editor, sitePath);
    } catch {
      // If the configured editor fails, fall back to system open
      await execa('open', [sitePath]);
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to open editor.' },
      { status: 500 }
    );
  }
}
