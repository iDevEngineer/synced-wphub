import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { readStagingConfig, stagingConfigExists } from '../../../../lib/staging-server';
import { getSiteRunning } from '../../../../lib/sites-server';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';
import { sshRun, scpFrom, rsyncFrom } from '../../../../lib/ssh-server';

interface Params {
  params: { slug: string };
}

function resolveWpBin(): string {
  const localWp = join(homedir(), '.local', 'bin', 'wp');
  return existsSync(localWp) ? localWp : 'wp';
}

function ensureBackupDir(slug: string): string {
  const dir = join(homedir(), '.synced', 'backups', slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { slug } = params;
    const body = await req.json().catch(() => ({}));
    const syncMedia = body.media !== false;

    const config = readConfig();
    if (!config) {
      return NextResponse.json({ error: 'No Synced config found.' }, { status: 400 });
    }

    if (!stagingConfigExists(slug)) {
      return NextResponse.json(
        { error: 'No hosting provider configured. Add one in Settings to enable deploy, push, and pull.' },
        { status: 400 }
      );
    }

    const name = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const sitePath = getSitePath(config, name);
    if (!existsSync(sitePath)) {
      return NextResponse.json({ error: `Site directory not found: ${sitePath}` }, { status: 404 });
    }

    const stagingConfig = readStagingConfig(slug);
    const { sshHost, sshUser, wpPath, stagingUrl } = stagingConfig;
    const wpBin = resolveWpBin();

    // Backup local DB
    const backupDir = ensureBackupDir(slug);
    const localBackupFile = `local-${timestamp()}.sql`;
    const localBackupPath = join(backupDir, localBackupFile);
    await execa(wpBin, ['db', 'export', localBackupPath, `--path=${sitePath}`, '--allow-root'], { stdio: 'inherit' });

    // Export staging DB
    const remotePullSql = `/tmp/synced-${slug}-pull.sql`;
    await sshRun(sshHost, sshUser, `wp db export ${remotePullSql} --path=${wpPath} --allow-root`);

    // Download SQL
    const localPullSql = `/tmp/synced-${slug}-pull.sql`;
    await scpFrom(sshHost, sshUser, remotePullSql, localPullSql);

    // Import locally
    await execa(wpBin, ['db', 'import', localPullSql, `--path=${sitePath}`, '--allow-root'], { stdio: 'inherit' });

    // URL search-replace locally
    const running = getSiteRunning(slug);
    const localPort = running?.port ?? 8881;
    const localUrl = `http://localhost:${localPort}`;
    await execa(wpBin, ['search-replace', stagingUrl, localUrl, `--path=${sitePath}`, '--allow-root'], {
      stdio: 'inherit',
    });

    // Rsync media
    if (syncMedia) {
      const remoteUploads = `${wpPath}/wp-content/uploads/`;
      const localUploads = join(sitePath, 'wp-content', 'uploads') + '/';
      try {
        await rsyncFrom(sshHost, sshUser, remoteUploads, localUploads);
      } catch {
        // Non-fatal
      }
    }

    // Cleanup
    await execa('rm', ['-f', localPullSql]).catch(() => {});
    await sshRun(sshHost, sshUser, `rm -f ${remotePullSql}`).catch(() => {});

    return NextResponse.json({ success: true, message: 'Staging database pulled to local.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
