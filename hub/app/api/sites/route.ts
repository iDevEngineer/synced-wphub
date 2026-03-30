import { NextResponse } from 'next/server';
import { readConfig } from '../../lib/config-server';
import { getAllSites, getRunning } from '../../lib/sites-server';

export async function GET() {
  try {
    const config = readConfig();
    if (!config) {
      return NextResponse.json({ sites: [] });
    }

    const sites = getAllSites(config);
    const running = getRunning();

    const merged = sites.map((site: { slug: string; name: string; path: string }) => ({
      ...site,
      status: running[site.slug] ? 'running' : 'stopped',
      url: running[site.slug]?.url ?? null,
      port: running[site.slug]?.port ?? null,
    }));

    return NextResponse.json({ sites: merged });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
