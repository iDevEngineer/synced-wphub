import { NextResponse } from 'next/server';
import { readConfig, getSitePath } from '../../../../lib/config-server';
import { readStagingConfig, stagingConfigExists } from '../../../../lib/staging-server';
import { getSiteRunning } from '../../../../lib/sites-server';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execa } from 'execa';
import { sshRun, scpTo, rsyncTo } from '../../../../lib/ssh-server';

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

    // Backup staging DB
    const backupDir = ensureBackupDir(slug);
    const stagingBackupFile = `staging-${timestamp()}.sql`;
    const stagingBackupPath = join(backupDir, stagingBackupFile);
    const remoteStagingBackup = `/tmp/synced-${slug}-staging-backup.sql`;

    await sshRun(sshHost, sshUser, `wp db export ${remoteStagingBackup} --path=${wpPath} --allow-root`);
    await scpTo(sshHost, sshUser, remoteStagingBackup, stagingBackupPath);
    await sshRun(sshHost, sshUser, `rm -f ${remoteStagingBackup}`);

    // Export local DB
    const localSqlFile = `/tmp/synced-${slug}-push.sql`;
    await execa(wpBin, ['db', 'export', localSqlFile, `--path=${sitePath}`, '--allow-root'], { stdio: 'inherit' });

    // Upload to staging
    const remotePushSql = `/tmp/synced-${slug}-push.sql`;
    await scpTo(sshHost, sshUser, localSqlFile, remotePushSql);

    // Import on staging
    await sshRun(sshHost, sshUser, `wp db import ${remotePushSql} --path=${wpPath} --allow-root`);

    // URL search-replace
    const running = getSiteRunning(slug);
    const localPort = running?.port ?? 8881;
    const localUrl = `http://localhost:${localPort}`;
    await sshRun(sshHost, sshUser, `wp search-replace '${localUrl}' '${stagingUrl}' --path=${wpPath} --allow-root`);

    // Rsync media
    if (syncMedia) {
      const localUploads = join(sitePath, 'wp-content', 'uploads') + '/';
      const remoteUploads = `${wpPath}/wp-content/uploads/`;
      try {
        await rsyncTo(sshHost, sshUser, localUploads, remoteUploads);
      } catch {
        // Non-fatal
      }
    }

    // Cleanup
    await execa('rm', ['-f', localSqlFile]).catch(() => {});
    await sshRun(sshHost, sshUser, `rm -f ${remotePushSql}`).catch(() => {});

    return NextResponse.json({ success: true, message: 'Local database pushed to staging.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
