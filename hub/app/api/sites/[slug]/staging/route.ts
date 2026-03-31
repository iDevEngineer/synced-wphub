import { NextRequest } from 'next/server';
import path from 'path';
import { homedir } from 'os';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

function stagingPath(slug: string) {
  return path.join(homedir(), '.synced', 'sites', `${slug}.json`);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const dir = path.join(homedir(), '.synced', 'sites');
    mkdirSync(dir, { recursive: true });

    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(readFileSync(stagingPath(slug), 'utf-8'));
    } catch {
      // no existing config
    }

    const updated = { ...existing, slug, ...body };
    writeFileSync(stagingPath(slug), JSON.stringify(updated, null, 2));
    return Response.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save staging config.';
    return Response.json({ error: message }, { status: 500 });
  }
}
