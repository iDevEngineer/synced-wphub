import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { getNextPort, getSiteRunning, registerSite } from '../../../../lib/sites-server';
import { startWordPress, killWpNow } from '../../../../lib/wordpress-server';
import { existsSync } from 'fs';
import { join } from 'path';

interface Params {
  params: { slug: string };
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { slug } = params;

    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No Synced config found. Run synced setup first.' }, { status: 400 });
    }

    // Derive name from slug for getSitePath
    const name = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const sitePath = getSitePath(config, name);

    if (!existsSync(sitePath)) {
      return NextResponse.json({ error: `Site directory not found: ${sitePath}` }, { status: 404 });
    }

    const existing = getSiteRunning(slug);
    if (existing) {
      return NextResponse.json({ error: `${name} is already running at ${existing.url}` }, { status: 409 });
    }

    const port = getNextPort();
    await killWpNow(port);

    const blueprintPath = join(sitePath, 'blueprint.json');
    const url = await startWordPress(sitePath, port, blueprintPath);

    registerSite(slug, port, 0, url, name);

    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
