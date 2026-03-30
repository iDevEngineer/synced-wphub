import { NextResponse } from 'next/server';
import { rmSync } from 'fs';
import { join } from 'path';
import { readConfig, resolveSitesPath } from '../../../lib/config-server';
import { getAllSites, getRunning, getSiteRunning, unregisterSite } from '../../../lib/sites-server';
import { killWpNow } from '../../../lib/wordpress-server';
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

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { slug } = params;

    const body = await req.json().catch(() => ({})) as { deleteFiles?: boolean };
    const deleteFiles = body.deleteFiles === true;

    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No config found' }, { status: 404 });
    }

    // Stop the site if running
    const entry = getSiteRunning(slug);
    if (entry) {
      await killWpNow(entry.port);
      unregisterSite(slug);
    }

    // If already unregistered we still ensure it's removed
    unregisterSite(slug);

    // Optionally delete the site directory
    if (deleteFiles) {
      const sitesPath = resolveSitesPath(config.sitesPath as string);
      const sitePath = join(sitesPath, slug);
      rmSync(sitePath, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
