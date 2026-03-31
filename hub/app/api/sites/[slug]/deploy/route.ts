import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { readStagingConfig, stagingConfigExists } from '../../../../lib/staging-server';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { getProvider } from '../../../../lib/providers-server';
// Note: getProvider is async — must be awaited

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;

    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No Synced config found.' }, { status: 400 });
    }

    const name = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const sitePath = getSitePath(config, name);

    if (!existsSync(sitePath)) {
      return NextResponse.json({ error: `Site directory not found: ${sitePath}` }, { status: 404 });
    }

    if (!stagingConfigExists(slug)) {
      return NextResponse.json(
        { error: 'No hosting provider configured. Add one in Settings to enable deploy, push, and pull.' },
        { status: 400 }
      );
    }

    const stagingConfig = readStagingConfig(slug);

    // Git commit + push
    try {
      await execa('git', ['add', '.'], { cwd: sitePath });
      const { stdout: status } = await execa('git', ['status', '--porcelain'], { cwd: sitePath });
      if (status.trim()) {
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
        await execa('git', ['commit', '-m', `deploy: ${timestamp}`], { cwd: sitePath });
      }
      await execa('git', ['push', 'origin', 'HEAD'], { cwd: sitePath });
    } catch (err: unknown) {
      // Non-fatal if no remote configured; continue with provider deploy
      const message = err instanceof Error ? err.message : '';
      if (message && !message.includes('nothing to commit') && !message.includes('no upstream')) {
        console.warn('Git push warning:', message);
      }
    }

    // Provider deploy
    const provider = await getProvider(stagingConfig.provider as string);
    await provider.deploy(stagingConfig as Record<string, unknown>, sitePath, slug);

    return NextResponse.json({ success: true, message: 'Deployed. Cache cleared.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('SSH authentication')) {
      return NextResponse.json(
        { error: 'SSH authentication failed. Check your key is added to the hosting provider and try again.' },
        { status: 500 }
      );
    }
    if (message.includes('WP-CLI not found')) {
      return NextResponse.json(
        { error: 'WP-CLI not found on the remote server. Install it on staging before running deploy commands.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
