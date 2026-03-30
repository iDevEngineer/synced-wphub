import { NextResponse } from 'next/server';
import { readConfig } from '../../../lib/config-server';
import { getAllSites, getRunning } from '../../../lib/sites-server';
import { readStagingConfig } from '../../../lib/staging-server';

interface Params {
  params: { slug: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = params;
    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No config found' }, { status: 404 });
    }

    const sites = getAllSites(config);
    const site = sites.find((s: { slug: string }) => s.slug === slug);
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const running = getRunning();
    const runningEntry = running[slug] ?? null;
    const stagingConfig = readStagingConfig(slug);

    return NextResponse.json({
      ...site,
      status: runningEntry ? 'running' : 'stopped',
      url: runningEntry?.url ?? null,
      port: runningEntry?.port ?? null,
      staging: stagingConfig,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
